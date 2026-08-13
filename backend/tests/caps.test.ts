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

// Mock the client database instance for all possible resolutions
mock.module("../src/db/client.ts", () => ({ db: dbProxy }));
mock.module("../src/db/client", () => ({ db: dbProxy }));

// Setup Gemini mock
const mockCreateInteraction = mock(() => {});
mock.module("../src/gemini/client.ts", () => {
  return {
    ai: {
      interactions: {
        create: mockCreateInteraction
      }
    },
    MODELS: {
      text: "gemini-3.5-flash",
      image: "gemini-3.1-flash-image",
    }
  };
});
mock.module("../src/gemini/client", () => {
  return {
    ai: {
      interactions: {
        create: mockCreateInteraction
      }
    },
    MODELS: {
      text: "gemini-3.5-flash",
      image: "gemini-3.1-flash-image",
    }
  };
});

import { runMigrations } from "../src/db/migrate";
import { runCharactersStep, runChaptersStep } from "../src/gemini/text-chain";
import { insertCharacter, listCharactersByProject } from "../src/db/queries/characters";
import { insertChapter, listChaptersByProject } from "../src/db/queries/chapters";

describe("Caps Enforcement Tests", () => {
  const projectId = "test-cap-project";
  const userId = "test-user-cap";

  beforeEach(() => {
    testDb = new Database(":memory:");
    testDb.run("PRAGMA foreign_keys = ON;");
    runMigrations();

    testDb.run(
      "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
      [userId, "cap@example.com", "Cap Tester"]
    );
    testDb.run(
      "INSERT INTO projects (id, user_id, title, book_text_path) VALUES (?, ?, ?, ?)",
      [projectId, userId, "Cap Book", "books/cap.txt"]
    );
  });

  it("should cap characters to exactly 2 when Gemini returns 3", async () => {
    // Mock Gemini returning 3 characters
    const mockOutputText = JSON.stringify([
      { name: "Alice", prompt: "A girl with green hair" },
      { name: "Bob", prompt: "A tall boy with glasses" },
      { name: "Charlie", prompt: "An old man with a beard" }
    ]);

    mockCreateInteraction.mockImplementation(() => {
      return Promise.resolve({
        id: "interaction-char-1",
        output_text: mockOutputText
      });
    });

    const result = await runCharactersStep("fake-interaction-id");
    expect(result.characters.length).toBe(2);
    expect(result.characters[0].name).toBe("Alice");
    expect(result.characters[1].name).toBe("Bob");

    // Save them to DB
    for (const char of result.characters) {
      insertCharacter(crypto.randomUUID(), projectId, char.name, char.prompt);
    }

    const saved = listCharactersByProject(projectId);
    expect(saved.length).toBe(2);
    expect(saved[0].name).toBe("Alice");
    expect(saved[1].name).toBe("Bob");
  });

  it("should cap chapters to exactly 1 when Gemini returns 2", async () => {
    // Mock Gemini returning 2 chapters
    const mockOutputText = JSON.stringify([
      { name: "Chapter 1: The Beginning", prompt: "A forest scene" },
      { name: "Chapter 2: The Forest", prompt: "A dark castle" }
    ]);

    mockCreateInteraction.mockImplementation(() => {
      return Promise.resolve({
        id: "interaction-chap-1",
        output_text: mockOutputText
      });
    });

    const result = await runChaptersStep("fake-interaction-id");
    expect(result.chapters.length).toBe(1);
    expect(result.chapters[0].name).toBe("Chapter 1: The Beginning");

    // Save them to DB
    for (const chap of result.chapters) {
      insertChapter(crypto.randomUUID(), projectId, chap.name, chap.prompt);
    }

    const saved = listChaptersByProject(projectId);
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe("Chapter 1: The Beginning");
  });
});
