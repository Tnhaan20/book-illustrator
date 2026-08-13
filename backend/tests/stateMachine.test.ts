import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";

// Set up mutable variable for the active in-memory database
let testDb: Database;

// Create a Proxy that forwards all properties and method calls to the active testDb
// Binding functions to testDb is necessary to avoid "Cannot access invalid private field" issues
// with bun:sqlite's internal private properties/methods.
const dbProxy = new Proxy({} as any, {
  get(target, prop) {
    if (!testDb) {
      throw new Error("testDb is not initialized yet");
    }
    const val = Reflect.get(testDb, prop);
    if (typeof val === "function") {
      return val.bind(testDb);
    }
    return val;
  }
});

// Mock the client database instance for all possible import resolutions
mock.module("../src/db/client.ts", () => ({ db: dbProxy }));
mock.module("../src/db/client", () => ({ db: dbProxy }));

// Import the actual implementation functions. They will resolve to our mocked dbProxy.
import { runMigrations } from "../src/db/migrate";
import {
  initPipelineState,
  getPipelineState,
  tryStartStep,
  claimStepForRetry,
  markStepDone,
  markStepFailed
} from "../src/db/queries/pipeline";

describe("State Machine - Pipeline State Transitions", () => {
  const projectId = "test-project-123";
  const userId = "test-user-123";

  beforeEach(() => {
    // 1. Create a fresh in-memory database
    testDb = new Database(":memory:");
    testDb.run("PRAGMA foreign_keys = ON;");

    // 2. Run migrations to initialize all tables
    runMigrations();

    // 3. Insert mock user and project needed for foreign keys
    testDb.run(
      "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
      [userId, "test@example.com", "Test User"]
    );
    testDb.run(
      "INSERT INTO projects (id, user_id, title, book_text_path) VALUES (?, ?, ?, ?)",
      [projectId, userId, "Test Book", "books/test.txt"]
    );

    // 4. Initialize pipeline state (starts all steps as 'pending')
    initPipelineState(projectId);
  });

  it("should transition pending -> running -> done correctly", () => {
    const stateBefore = getPipelineState(projectId);
    expect(stateBefore?.step_style).toBe("pending");

    // Start style step (pending -> running)
    const claimed = tryStartStep(projectId, "step_style");
    expect(claimed).toBe(true);

    const stateRunning = getPipelineState(projectId);
    expect(stateRunning?.step_style).toBe("running");
    expect(stateRunning?.step_started_at).not.toBeNull();

    // Finish style step (running -> done)
    markStepDone(projectId, "step_style");
    const stateDone = getPipelineState(projectId);
    expect(stateDone?.step_style).toBe("done");
  });

  it("should block starting a step that is already running", () => {
    // Claim first time (succeeds)
    const firstClaim = tryStartStep(projectId, "step_style");
    expect(firstClaim).toBe(true);

    // Claim second time (blocked, returns false)
    const secondClaim = tryStartStep(projectId, "step_style");
    expect(secondClaim).toBe(false);

    const state = getPipelineState(projectId);
    expect(state?.step_style).toBe("running");
  });

  it("should block starting a step if its previous step in order is not done", () => {
    // Attempting to start step_characters while step_style is pending (should throw)
    expect(() => {
      tryStartStep(projectId, "step_characters");
    }).toThrow(/Previous step step_style must complete first/);

    const state = getPipelineState(projectId);
    expect(state?.step_characters).toBe("pending");
  });

  it("should allow retrying a failed step without affecting other steps", () => {
    // Complete style step
    tryStartStep(projectId, "step_style");
    markStepDone(projectId, "step_style");

    // Fail characters step
    tryStartStep(projectId, "step_characters");
    markStepFailed(projectId, "step_characters");

    const stateFailed = getPipelineState(projectId);
    expect(stateFailed?.step_style).toBe("done");
    expect(stateFailed?.step_characters).toBe("failed");
    expect(stateFailed?.step_portraits).toBe("pending");

    // Retry characters step (sets to running)
    const retried = claimStepForRetry(projectId, "step_characters");
    expect(retried).toBe(true);

    const stateRetried = getPipelineState(projectId);
    expect(stateRetried?.step_style).toBe("done");
    expect(stateRetried?.step_characters).toBe("running");
    expect(stateRetried?.step_portraits).toBe("pending");
  });

  it("should allow restarting a stuck running step via retry after stuck-threshold", () => {
    // Start style step
    tryStartStep(projectId, "step_style");

    const oldTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago (threshold is 3 min)
    testDb.run(
      "UPDATE pipeline_state SET step_started_at = ? WHERE project_id = ?",
      [oldTime, projectId]
    );

    // Try to start step normally (should be blocked since status is running)
    const claimedNormally = tryStartStep(projectId, "step_style");
    expect(claimedNormally).toBe(false);

    // Should allow retry since it is stuck running
    const retried = claimStepForRetry(projectId, "step_style");
    expect(retried).toBe(true);

    const state = getPipelineState(projectId);
    expect(state?.step_style).toBe("running");
  });
});
