import {
  NextFunction,
  Response,
} from 'express';

import {
  AuthRequest,
  Role,
} from '../types/index.js';

import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/http.js';

export function auth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      throw new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication required',
      );
    }

    const token = authorization.slice(7);

    const payload = verifyToken(token);

    req.user = {
      id: payload.id,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError(
        401,
        'INVALID_TOKEN',
        'Invalid or expired token',
      ),
    );
  }
}

export function requireRoles(
  ...roles: Role[]
) {
  return (
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return next(
        new AppError(
          401,
          'UNAUTHORIZED',
          'Authentication required',
        ),
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'Insufficient permissions',
        ),
      );
    }

    next();
  };
}