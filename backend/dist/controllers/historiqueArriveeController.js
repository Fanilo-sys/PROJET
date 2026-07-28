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
exports.listerArriveesParGroupe = exports.listerGroupesArrivee = exports.archiverArrivee = void 0;
const db_1 = __importDefault(require("../config/db"));
const socket_1 = require("../socket");
const archiverArrivee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { periode, dossierIds } = req.body;
    if (!periode)
        return res.status(400).json({ error: "Période requise" });
    try {
        // Créer ou récupérer le groupe
        let groupe;
        const existing = yield db_1.default.query('SELECT * FROM historique_arrivee_groupes WHERE lower(trim(periode)) = lower(trim($1)) LIMIT 1', [periode]);
        if (existing.rows.length > 0) {
            groupe = existing.rows[0];
            if (groupe.periode !== periode.trim()) {
                yield db_1.default.query('UPDATE historique_arrivee_groupes SET periode = $1 WHERE id = $2', [periode.trim(), groupe.id]);
                groupe.periode = periode.trim();
            }
        }
        else {
            const insertRes = yield db_1.default.query('INSERT INTO historique_arrivee_groupes (periode) VALUES ($1) RETURNING *', [periode.trim()]);
            groupe = insertRes.rows[0];
        }
        const groupeId = groupe.id;
        const totalDemandes = (dossierIds && Array.isArray(dossierIds)) ? dossierIds.length : 0;
        // Récupérer les dossiers à archiver (présents dans annuaire_entries, pas déjà dans historique_arrivee)
        let dossiers;
        if (dossierIds && Array.isArray(dossierIds) && dossierIds.length > 0) {
            dossiers = yield db_1.default.query(`SELECT d.id, d.num_chrono, d.nom_association, d.siege, d.district, d.president,
                d.type_dossier, d.categorie, d.date_depot, d.heure_depot
         FROM dossiers d
         WHERE d.id = ANY($1::int[])
           AND EXISTS (SELECT 1 FROM annuaire_entries ae WHERE ae.dossier_id = d.id)
           AND NOT EXISTS (SELECT 1 FROM historique_arrivee ha WHERE ha.dossier_id = d.id)`, [dossierIds]);
        }
        else {
            dossiers = yield db_1.default.query(`SELECT d.id, d.num_chrono, d.nom_association, d.siege, d.district, d.president,
                d.type_dossier, d.categorie, d.date_depot, d.heure_depot
         FROM dossiers d
         WHERE d.status NOT IN ('defavorable_traite', 'historique_sortie')
           AND EXISTS (SELECT 1 FROM annuaire_entries ae WHERE ae.dossier_id = d.id)
           AND NOT EXISTS (SELECT 1 FROM historique_arrivee ha WHERE ha.dossier_id = d.id)`);
        }
        const archivedCount = dossiers.rows.length;
        const skippedCount = totalDemandes > 0 ? totalDemandes - archivedCount : 0;
        if (archivedCount === 0) {
            const msg = totalDemandes > 0
                ? `Aucun des ${totalDemandes} dossier(s) sélectionné(s) n'est présent dans l'annuaire. Aucun dossier archivé.`
                : "Aucun dossier trouvé dans l'annuaire à archiver";
            return res.json({ message: msg, archivedCount: 0, skippedCount: totalDemandes, groupe });
        }
        for (const d of dossiers.rows) {
            yield db_1.default.query(`INSERT INTO historique_arrivee (groupe_id, dossier_id, num_chrono, nom_association, siege, district, president, type_dossier, categorie, date_arrivee, heure_depot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [groupeId, d.id, d.num_chrono, d.nom_association || '', d.siege || '', d.district || '', d.president || '', d.type_dossier || '', d.categorie || '', d.date_depot, d.heure_depot ? String(d.heure_depot).slice(0, 5) + ':00' : null]);
        }
        const targetIds = dossiers.rows.map(d => d.id);
        yield db_1.default.query("UPDATE dossiers SET status = 'archive_arrivee' WHERE id = ANY($1::int[])", [targetIds]);
        try {
            (_a = (0, socket_1.getIO)()) === null || _a === void 0 ? void 0 : _a.emit('dossiers:archived', { ids: targetIds });
        }
        catch (_) { }
        try {
            (_b = (0, socket_1.getIO)()) === null || _b === void 0 ? void 0 : _b.emit('historique-arrivee:changed', { groupeId });
        }
        catch (_) { }
        let message = `${archivedCount} dossier(s) archivé(s) dans l'historique arrivée`;
        if (skippedCount > 0)
            message += `. ${skippedCount} dossier(s) ignoré(s) car non présent(s) dans l'annuaire.`;
        res.json({ message, archivedCount, skippedCount, groupe });
    }
    catch (err) {
        console.error('❌ Erreur archivage arrivée :', err);
        res.status(500).json({ error: "Erreur lors de l'archivage" });
    }
});
exports.archiverArrivee = archiverArrivee;
const listerGroupesArrivee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groupes = yield db_1.default.query('SELECT * FROM historique_arrivee_groupes ORDER BY date_creation DESC');
        res.json(groupes.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage groupes arrivée :', err);
        res.status(500).json({ error: "Erreur lors de la récupération des groupes" });
    }
});
exports.listerGroupesArrivee = listerGroupesArrivee;
const listerArriveesParGroupe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupeId } = req.params;
    try {
        const result = yield db_1.default.query(`SELECT ha.*, COALESCE(a.nom, ha.nom_association, '') AS nom_association,
              COALESCE(a.siege, ha.siege, '') AS siege,
              COALESCE(a.district, ha.district, '') AS district,
              COALESCE(a.president, ha.president, '') AS president,
              COALESCE(a.abreviation, '') AS abreviation
       FROM historique_arrivee ha
       LEFT JOIN dossiers d ON d.id = ha.dossier_id
       LEFT JOIN associations a ON a.id = d.association_id
       WHERE ha.groupe_id = $1
       ORDER BY ha.nom_association`, [groupeId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage arrivées par groupe :', err);
        res.status(500).json({ error: "Erreur lors de la récupération" });
    }
});
exports.listerArriveesParGroupe = listerArriveesParGroupe;
