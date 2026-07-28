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
exports.listerHistoriqueDefavorable = exports.ajouterHistoriqueDefavorable = void 0;
const db_1 = __importDefault(require("../config/db"));
const ajouterHistoriqueDefavorable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { dossier_id, num_chrono, nom_association, siege, district, president, type_dossier, categorie, date_arrivee, heure_depot, personne_correction, date_prise, heure_prise } = req.body;
    try {
        const result = yield db_1.default.query(`INSERT INTO historique_defavorable
       (dossier_id, num_chrono, nom_association, siege, district, president, type_dossier, categorie, date_arrivee, heure_depot, personne_correction, date_prise, heure_prise)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`, [dossier_id, num_chrono, nom_association || '', siege || '', district || '', president || '', type_dossier || '', categorie || '', date_arrivee, heure_depot || '', personne_correction || 'Agent', date_prise, heure_prise]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('❌ Erreur ajout historique défavorable :', err);
        res.status(500).json({ error: "Erreur lors de l'ajout à l'historique" });
    }
});
exports.ajouterHistoriqueDefavorable = ajouterHistoriqueDefavorable;
const listerHistoriqueDefavorable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`SELECT hd.*, COALESCE(a.nom, hd.nom_association, '') AS nom_association,
              COALESCE(a.siege, hd.siege, '') AS siege,
              COALESCE(a.district, hd.district, '') AS district,
              COALESCE(a.president, hd.president, '') AS president
       FROM historique_defavorable hd
       LEFT JOIN dossiers d ON d.id = hd.dossier_id
       LEFT JOIN associations a ON a.id = d.association_id
       ORDER BY hd.date_arrivee DESC`);
        res.status(200).json(result.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage historique défavorable :', err);
        res.status(500).json({ error: "Erreur lors de la récupération de l'historique" });
    }
});
exports.listerHistoriqueDefavorable = listerHistoriqueDefavorable;
