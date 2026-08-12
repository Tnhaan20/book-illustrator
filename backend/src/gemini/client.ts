// src/gemini/client.ts — singleton GoogleGenAI instance

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");

export const ai = new GoogleGenAI({ apiKey });

/** Model IDs — update here only, never hard-code elsewhere. */
export const MODELS = {
  text: "gemini-3.5-flash",
  image: "gemini-3.1-flash-image", // requires paid tier
} as const;
