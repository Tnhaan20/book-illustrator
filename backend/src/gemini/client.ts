// src/gemini/client.ts — singleton GoogleGenAI instance

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "mock-key-for-testing";
if (process.env.NODE_ENV !== "test" && !process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment");
}

export const ai = new GoogleGenAI({ apiKey });

/** Model IDs — update here only, never hard-code elsewhere. */
export const MODELS = {
  text: "gemini-3.5-flash",
  image: "gemini-3-pro-image-preview",
} as const;
