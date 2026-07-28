"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.ValidationError = exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Erreur interne du serveur';
    console.error(`[ERROR] ${statusCode} - ${message}`);
    if (err.details) {
        console.error('[DETAILS]', err.details);
    }
    res.status(statusCode).json(Object.assign({ error: message }, (err.details ? { details: err.details } : {})));
};
exports.errorHandler = errorHandler;
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.statusCode = 400;
        this.name = 'ValidationError';
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(resource) {
        super(`${resource} introuvable`);
        this.statusCode = 404;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
