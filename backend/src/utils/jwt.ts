import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '../types/index.js';

export function signToken(id: string, role: Role) {
  return jwt.sign(
    { id, role },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as any,
    },
  );
}

export function verifyToken(token: string) {
  return jwt.verify(
    token,
    env.JWT_SECRET,
  ) as {
    id: string;
    role: Role;
  };
}