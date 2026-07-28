import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erreur interne du serveur';

  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (err.details) {
    console.error('[DETAILS]', err.details);
  }

  res.status(statusCode).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
};

export class ValidationError extends Error {
  statusCode = 400;
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  statusCode = 404;

  constructor(resource: string) {
    super(`${resource} introuvable`);
    this.name = 'NotFoundError';
  }
}
