// src/routes/auth.ts — POST /auth/login

import { Router } from "express";
import { findUserByEmail, insertUser } from "../db/queries/users.ts";

const router = Router();

/**
 * POST /auth/login
 * Body: { email: string, name: string }
 *
 * Looks up the user by email.
 * - Exists → return the existing row (name is not updated).
 * - New    → create and return a new user row.
 *
 * Response 200: UserRow
 * Response 400: { error: string }
 */
router.post("/login", (req, res) => {
  const { email, name } = req.body as { email?: string; name?: string };

  // Validate
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  // Find-or-create
  const existing = findUserByEmail(email.toLowerCase().trim());
  if (existing) {
    res.json(existing);
    return;
  }

  const user = insertUser(crypto.randomUUID(), email.toLowerCase().trim(), name.trim());
  res.status(201).json(user);
});

export { router as authRouter };
