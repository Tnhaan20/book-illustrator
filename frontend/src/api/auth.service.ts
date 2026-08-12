// src/api/auth.service.ts
import api from './axios';
import type { User, LoginPayload } from '../types/auth';

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<User>('/auth/login', payload).then((r) => r.data),
};
