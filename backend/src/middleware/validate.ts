import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from './errorHandler';

/**
 * Middleware factory that validates req.body against a Zod schema.
 * If validation fails, throws a ValidationError with detailed messages.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      throw new ValidationError('Données invalides', messages);
    }
    req.body = result.data as Record<string, unknown>;
    next();
  };
};
