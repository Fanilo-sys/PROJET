"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ajouterAction = exports.listerJournal = void 0;
const db_1 = __importDefault(require("../config/db"));
const listerJournal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT * FROM journal ORDER BY date_action DESC');
        res.json(result.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage journal :', err);
        res.status(500).json({ error: "Erreur lors de la récupération du journal" });
    }
});
exports.listerJournal = listerJournal;
const ajouterAction = (action, details) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query('INSERT INTO journal (action, details) VALUES ($1, $2)', [action, details]);
    }
    catch (err) {
        console.error("❌ Erreur ajout journal", err);
    }
});
exports.ajouterAction = ajouterAction;
