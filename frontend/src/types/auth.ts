// src/types/auth.ts
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface LoginPayload {
  email: string;
  name: string;
}
