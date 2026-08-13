// backend/src/inspect-db.ts
// A quick database inspector script to print the pipeline state and project table.

import { db } from "./db/client";

console.log("=== PROJECTS ===");
const projects = db.query("SELECT id, title, status, created_at FROM projects").all();
console.log(JSON.stringify(projects, null, 2));

console.log("\n=== PIPELINE STATES ===");
const pipelines = db.query("SELECT * FROM pipeline_state").all();
console.log(JSON.stringify(pipelines, null, 2));
