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
exports.supprimerAssociation = exports.listerChronosAnnuaire = exports.modifierAssociation = exports.listerAssociationsParGroupe = exports.archiverDossiers = exports.ajouterAssociationManuelle = exports.creerGroupe = exports.listerGroupes = void 0;
const db_1 = __importDefault(require("../config/db"));
const socket_1 = require("../socket");
const listerGroupes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groupes = yield db_1.default.query('SELECT * FROM annuaire_groupes ORDER BY date_creation DESC');
        res.status(200).json(groupes.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage groupes :', err);
        res.status(500).json({ error: "Erreur lors de la récupération des groupes" });
    }
});
exports.listerGroupes = listerGroupes;
const creerGroupe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { periode } = req.body;
    const p = periode ? String(periode).trim() : '';
    if (!p)
        return res.status(400).json({ error: 'Période requise' });
    try {
        let groupe;
        try {
            const insertRes = yield db_1.default.query('INSERT INTO annuaire_groupes (periode) VALUES ($1) RETURNING *', [p]);
            groupe = insertRes.rows[0];
        }
        catch (err) {
            if (err && err.code === '23505') {
                const existing = yield db_1.default.query('SELECT * FROM annuaire_groupes WHERE lower(trim(periode)) = lower(trim($1)) LIMIT 1', [p]);
                groupe = existing.rows[0];
            }
            else
                throw err;
        }
        try {
            (0, socket_1.getIO)().emit('annuaire:groupCreated', groupe);
        }
        catch (_) { }
        return res.status(201).json(groupe);
    }
    catch (err) {
        console.error('❌ Erreur création groupe :', err);
        res.status(500).json({ error: "Erreur lors de la création du groupe" });
    }
});
exports.creerGroupe = creerGroupe;
const ajouterAssociationManuelle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { groupeId, periode, numero_sortie, nom_association, abreviation, siege, president, objet, type_dossier, arn, recuFr, recuMg } = req.body;
    try {
        let gid = groupeId;
        if (!gid && periode) {
            const p = String(periode).trim();
            try {
                const insertRes = yield db_1.default.query('INSERT INTO annuaire_groupes (periode) VALUES ($1) RETURNING *', [p]);
                gid = insertRes.rows[0].id;
            }
            catch (err) {
                if (err && err.code === '23505') {
                    const existing = yield db_1.default.query('SELECT id FROM annuaire_groupes WHERE lower(trim(periode)) = lower(trim($1)) LIMIT 1', [p]);
                    gid = (_a = existing.rows[0]) === null || _a === void 0 ? void 0 : _a.id;
                }
                else
                    throw err;
            }
        }
        if (!gid)
            return res.status(400).json({ error: 'Groupe ID ou période requis' });
        // Créer un dossier dans dossiers puis le lier à l'annuaire via annuaire_entries
        const now = new Date();
        const dateDepot = now.toISOString().split('T')[0];
        const heureDepot = now.toTimeString().slice(0, 5);
        // 1. Créer le dossier
        const dossierResult = yield db_1.default.query(`INSERT INTO dossiers (num_chrono, nom_association, siege, president, type_dossier, objet, abreviation, date_depot, heure_depot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'annuaire') RETURNING id`, [numero_sortie || '', nom_association || '', siege || '', president || '', type_dossier || 'Création', objet || '', abreviation || '', dateDepot, heureDepot]);
        const dossierId = dossierResult.rows[0].id;
        // 2. Associer l'association
        if (nom_association) {
            const assoc = yield db_1.default.query(`SELECT id FROM associations WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1)) LIMIT 1`, [nom_association.trim()]);
            if (assoc.rows.length > 0) {
                yield db_1.default.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [assoc.rows[0].id, dossierId]);
            }
            else {
                const newAssoc = yield db_1.default.query(`INSERT INTO associations (nom, siege, president) VALUES ($1, $2, $3) RETURNING id`, [nom_association.trim(), siege || '', president || '']);
                yield db_1.default.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [newAssoc.rows[0].id, dossierId]);
            }
        }
        // 3. Lier à l'annuaire
        yield db_1.default.query(`INSERT INTO annuaire_entries (dossier_id, groupe_id) VALUES ($1, $2) ON CONFLICT (dossier_id) DO NOTHING`, [dossierId, gid]);
        // 4. Récupérer l'entrée complète pour la réponse
        const fullEntry = yield db_1.default.query(`
      SELECT d.*, a.nom AS association_nom, a.abreviation AS association_abreviation
      FROM dossiers d
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE d.id = $1
    `, [dossierId]);
        try {
            (0, socket_1.getIO)().emit('annuaire:associationAdded', { association: fullEntry.rows[0], groupeId: gid });
        }
        catch (_) { }
        res.status(201).json(fullEntry.rows[0]);
    }
    catch (err) {
        console.error('Erreur ajout manuel annuaire', err);
        res.status(500).json({ error: "Erreur lors de l'ajout" });
    }
});
exports.ajouterAssociationManuelle = ajouterAssociationManuelle;
const archiverDossiers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { dossierIds, groupeId } = req.body;
    try {
        // Vérifier que les dossiers existent
        const dossiers = yield db_1.default.query('SELECT id, status FROM dossiers WHERE id = ANY($1::int[])', [dossierIds]);
        if (dossiers.rows.length === 0) {
            return res.status(404).json({ error: "Aucun dossier trouvé" });
        }
        // Insérer les entrées annuaire
        for (const d of dossiers.rows) {
            yield db_1.default.query(`INSERT INTO annuaire_entries (dossier_id, groupe_id) VALUES ($1, $2) ON CONFLICT (dossier_id) DO NOTHING`, [d.id, groupeId]);
        }
        // Mettre à jour le statut
        const targetIds = dossiers.rows.map(d => d.id);
        yield db_1.default.query("UPDATE dossiers SET status = 'archive_annuaire' WHERE id = ANY($1::int[])", [targetIds]);
        try {
            (0, socket_1.getIO)().emit('annuaire:changed', { groupeId });
            (0, socket_1.getIO)().emit('dossiers:archived', { ids: targetIds });
        }
        catch (_) { }
        res.json({ message: `${dossiers.rows.length} dossier(s) archivé(s)` });
    }
    catch (err) {
        console.error('❌ Erreur archivage :', err);
        res.status(500).json({ error: "Erreur lors de l'archivage" });
    }
});
exports.archiverDossiers = archiverDossiers;
const listerAssociationsParGroupe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupeId } = req.params;
    try {
        // Lister les dossiers liés à ce groupe via annuaire_entries
        const result = yield db_1.default.query(`
      SELECT d.*, a.nom AS association_nom, a.siege AS association_siege,
        a.district AS association_district, a.president AS association_president,
        a.abreviation AS association_abreviation,
        COALESCE(a.nom, d.nom_association, '') AS nom_association,
        COALESCE(a.siege, d.siege, '') AS siege,
        COALESCE(a.district, d.district, '') AS district,
        COALESCE(a.president, d.president, '') AS president,
        COALESCE(a.abreviation, d.abreviation, '') AS abreviation
      FROM dossiers d
      JOIN annuaire_entries ae ON ae.dossier_id = d.id
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE ae.groupe_id = $1
      ORDER BY d.nom_association
    `, [groupeId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage associations par groupe :', err);
        res.status(500).json({ error: "Erreur lors de la récupération des associations" });
    }
});
exports.listerAssociationsParGroupe = listerAssociationsParGroupe;
const modifierAssociation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { nom_association, siege, president, type_dossier, objet, abreviation, numero_sortie, arn, recuFr, recuMg } = req.body;
    try {
        // Mettre à jour le dossier sous-jacent
        const result = yield db_1.default.query(`UPDATE dossiers SET
        nom_association = COALESCE($2, nom_association),
        siege = COALESCE($3, siege),
        president = COALESCE($4, president),
        type_dossier = COALESCE($5, type_dossier),
        objet = COALESCE($6, objet),
        abreviation = COALESCE($7, abreviation),
        numero_sortie = COALESCE($8, numero_sortie),
        arn = COALESCE($9, arn),
        recu_fr = COALESCE($10, recu_fr),
        recu_mg = COALESCE($11, recu_mg),
        date_modification = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id`, [id, nom_association, siege, president, type_dossier, objet, abreviation, numero_sortie, arn, recuFr, recuMg]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Entrée non trouvée" });
        // Mettre à jour l'association si le nom change
        if (nom_association) {
            const assoc = yield db_1.default.query(`SELECT id FROM associations WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1)) LIMIT 1`, [nom_association.trim()]);
            if (assoc.rows.length > 0) {
                yield db_1.default.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [assoc.rows[0].id, id]);
            }
            else {
                const newAssoc = yield db_1.default.query(`INSERT INTO associations (nom, siege, president) VALUES ($1, $2, $3) RETURNING id`, [nom_association.trim(), siege || '', president || '']);
                yield db_1.default.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [newAssoc.rows[0].id, id]);
            }
        }
        const updated = yield db_1.default.query(`
      SELECT d.*, a.nom AS association_nom, a.abreviation AS association_abreviation
      FROM dossiers d
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE d.id = $1
    `, [id]);
        try {
            (0, socket_1.getIO)().emit('annuaire:changed', { association: updated.rows[0] });
        }
        catch (_) { }
        res.json(updated.rows[0]);
    }
    catch (err) {
        console.error('Erreur modification association', err);
        res.status(500).json({ error: "Erreur lors de la modification" });
    }
});
exports.modifierAssociation = modifierAssociation;
const listerChronosAnnuaire = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT DISTINCT d.num_chrono FROM dossiers d JOIN annuaire_entries ae ON ae.dossier_id = d.id WHERE d.num_chrono IS NOT NULL AND d.num_chrono != \'\'');
        res.json(result.rows.map((r) => r.num_chrono));
    }
    catch (err) {
        console.error('❌ Erreur listage chronos annuaire :', err);
        res.status(500).json({ error: "Erreur lors de la récupération des chronos" });
    }
});
exports.listerChronosAnnuaire = listerChronosAnnuaire;
const supprimerAssociation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Supprimer l'entrée annuaire (annuaire_entries), puis le dossier
        yield db_1.default.query('DELETE FROM annuaire_entries WHERE dossier_id = $1', [id]);
        const result = yield db_1.default.query('DELETE FROM dossiers WHERE id = $1 AND status IN (\'annuaire\', \'archive_annuaire\') RETURNING *', [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Entrée non trouvée" });
        try {
            (0, socket_1.getIO)().emit('annuaire:changed', { deletedId: id });
        }
        catch (_) { }
        res.json({ message: "Entrée annuaire supprimée" });
    }
    catch (err) {
        console.error('Erreur suppression association', err);
        res.status(500).json({ error: "Erreur lors de la suppression" });
    }
});
exports.supprimerAssociation = supprimerAssociation;
