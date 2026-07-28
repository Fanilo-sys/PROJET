"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
const crypto_1 = __importDefault(require("crypto"));
// Si JWT_SECRET est défini dans .env, on l'utilise.
// Sinon, on génère une clé aléatoire (change à chaque redémarrage du serveur).
exports.JWT_SECRET = process.env.JWT_SECRET || crypto_1.default.randomBytes(32).toString('hex');
