"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const errorHandler_1 = require("./errorHandler");
/**
 * Middleware factory that validates req.body against a Zod schema.
 * If validation fails, throws a ValidationError with detailed messages.
 */
const validate = (schema) => {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const messages = result.error.issues.map(e => ({
                path: e.path.join('.'),
                message: e.message,
            }));
            throw new errorHandler_1.ValidationError('Données invalides', messages);
        }
        req.body = result.data;
        next();
    };
};
exports.validate = validate;
