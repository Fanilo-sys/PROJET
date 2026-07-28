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
exports.listerSorties = exports.getStats = exports.archiverSortie = exports.listerDossiersParStatuts = exports.getDossiersParTypeCtrl = exports.getDossiersParDistrictCtrl = exports.getDossiersParCategorieCtrl = exports.listerDuplicatas = exports.approuverDuplicata = exports.creerDuplicata = exports.listerDossiersParStatut = exports.supprimerDossier = exports.modifierDossierComplet = exports.modifierDossier = exports.listerDossiers = exports.creerDossier = exports.initDossierSelect = void 0;
const db_1 = __importDefault(require("../config/db"));
const socket_1 = require("../socket");
// ============================================================
// STATUTS PROTÉGÉS (non modifiables)
// ============================================================
const STATUTS_PROTEGES = ['registre_chrono', 'annuaire', 'archive_annuaire', 'historique_sortie'];
const estProtege = (status) => {
    return STATUTS_PROTEGES.includes(status);
};
// ============================================================
// UTILITAIRES
// ============================================================
const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const getOrCreateGroupeArrivee = (dateDepot) => __awaiter(void 0, void 0, void 0, function* () {
    const d = new Date(dateDepot + 'T12:00:00Z');
    const periode = `${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const existing = yield db_1.default.query('SELECT id, periode FROM historique_arrivee_groupes WHERE lower(trim(periode)) = lower(trim($1)) LIMIT 1', [periode]);
    if (existing.rows.length > 0) {
        if (existing.rows[0].periode !== periode) {
            yield db_1.default.query('UPDATE historique_arrivee_groupes SET periode = $1 WHERE id = $2', [periode, existing.rows[0].id]);
        }
        return existing.rows[0].id;
    }
    const insert = yield db_1.default.query('INSERT INTO historique_arrivee_groupes (periode) VALUES ($1) RETURNING id', [periode]);
    return insert.rows[0].id;
});
/**
 * DOSSIER_SELECT — initialisé au démarrage. Détecte si la colonne association_id
 * existe dans dossiers. Si oui, JOIN sur associations. Sinon, SELECT simple.
 * Cette variable est mise à jour par initDossierSelect() appelée depuis initTables.
 */
let DOSSIER_SELECT = 'SELECT d.* FROM dossiers d';
/** Initialise DOSSIER_SELECT (appelé par initTables après création des tables) */
const initDossierSelect = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query('SELECT association_id FROM dossiers LIMIT 0');
        DOSSIER_SELECT = `
      SELECT d.*,
        COALESCE(a.nom, d.nom_association, '') AS nom_association,
        COALESCE(a.siege, d.siege, '') AS siege,
        COALESCE(a.district, d.district, '') AS district,
        COALESCE(a.president, d.president, '') AS president,
        COALESCE(a.abreviation, d.abreviation, '') AS abreviation,
        a.nom AS association_nom,
        a.siege AS association_siege,
        a.district AS association_district,
        a.president AS association_president,
        a.abreviation AS association_abreviation
      FROM dossiers d
      LEFT JOIN associations a ON a.id = d.association_id
    `;
        console.log('✅ DOSSIER_SELECT: mode normalisé (avec associations)');
    }
    catch (_a) {
        DOSSIER_SELECT = 'SELECT d.* FROM dossiers d';
        console.log('ℹ️ DOSSIER_SELECT: mode compatible (sans association_id)');
    }
});
exports.initDossierSelect = initDossierSelect;
/**
 * Remplit association_id dans dossiers si manquant
 */
const ensureAssociationId = (dossierId, nom, district) => __awaiter(void 0, void 0, void 0, function* () {
    if (!nom || nom.trim() === '')
        return;
    const cleanNom = nom.trim();
    const cleanDistrict = (district || '').trim();
    const assoc = yield db_1.default.query(`SELECT id FROM associations WHERE LOWER(TRIM(nom)) = LOWER($1) AND LOWER(TRIM(district)) = LOWER($2) LIMIT 1`, [cleanNom, cleanDistrict]);
    let assocId;
    if (assoc.rows.length > 0) {
        assocId = assoc.rows[0].id;
    }
    else {
        const newAssoc = yield db_1.default.query(`INSERT INTO associations (nom, district, siege, president)
       VALUES ($1, $2, '', '') RETURNING id`, [cleanNom, cleanDistrict]);
        assocId = newAssoc.rows[0].id;
    }
    yield db_1.default.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [assocId, dossierId]);
});
/**
 * Remplit dossier_categories à partir d'une chaîne CSV
 */
const syncCategories = (dossierId, categorieCsv) => __awaiter(void 0, void 0, void 0, function* () {
    if (!categorieCsv || categorieCsv.trim() === '')
        return;
    const catNames = categorieCsv.split(',').map(c => c.trim()).filter(Boolean);
    if (catNames.length === 0)
        return;
    for (const name of catNames) {
        yield db_1.default.query(`INSERT INTO categories (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING`, [name]);
    }
    yield db_1.default.query(`INSERT INTO dossier_categories (dossier_id, categorie_id)
     SELECT $1, id FROM categories WHERE nom = ANY($2::varchar[])
     ON CONFLICT DO NOTHING`, [dossierId, catNames]);
});
// ============================================================
// CONTROLLERS
// ============================================================
const creerDossier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { num_chrono, nom_association, siege, district, president, type_dossier, sous_type, categorie, emplacement, arn, recu_fr, recu_mg, heure_depot, objet, abreviation, date_depot, status } = req.body;
    try {
        const existing = yield db_1.default.query(`SELECT id, status, num_chrono FROM dossiers
       WHERE num_chrono = $1 AND status != 'archive_arrivee'`, [num_chrono]);
        if (existing.rows.length > 0) {
            return res.status(409).json({
                error: 'Ce numéro d\'arrivée existe déjà dans un dossier actif.',
                existingDossier: existing.rows[0]
            });
        }
    }
    catch (err) {
        console.error('❌ Erreur vérification doublon :', err);
        return res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
    try {
        const result = yield db_1.default.query(`INSERT INTO dossiers (num_chrono, nom_association, siege, district, president, type_dossier, sous_type, categorie, emplacement, arn, recu_fr, recu_mg, heure_depot, objet, abreviation, date_depot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id, num_chrono, nom_association`, [num_chrono, nom_association || '', siege || '', district || '', president || '', type_dossier || '', sous_type || '', categorie || '', emplacement || '', arn || '', recu_fr || '', recu_mg || '', heure_depot || '', objet || '', abreviation || '', date_depot || null, status || 'reception']);
        const dossier = result.rows[0];
        yield ensureAssociationId(dossier.id, nom_association, district);
        yield syncCategories(dossier.id, categorie);
        try {
            const dateArrivee = date_depot || null;
            if (dateArrivee && String(dateArrivee).trim() !== '') {
                const groupeId = yield getOrCreateGroupeArrivee(dateArrivee);
                yield db_1.default.query(`INSERT INTO historique_arrivee (groupe_id, dossier_id, num_chrono, nom_association, siege, district, president, type_dossier, categorie, date_arrivee, heure_depot)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [groupeId, dossier.id, dossier.num_chrono, nom_association || '', siege || '', district || '', president || '', type_dossier || '', categorie || '', dateArrivee, heure_depot ? String(heure_depot).slice(0, 5) + ':00' : null]);
                try {
                    (0, socket_1.getIO)().emit('historique-arrivee:changed', { groupeId });
                }
                catch (_) { }
            }
        }
        catch (histErr) {
            console.error('⚠️ Dossier créé mais erreur insertion historique arrivée:', histErr);
        }
        const fullDossier = yield db_1.default.query(`${DOSSIER_SELECT} WHERE d.id = $1`, [dossier.id]);
        try {
            (0, socket_1.getIO)().emit('dossiers:created', { dossier: fullDossier.rows[0] });
        }
        catch (_) { }
        res.status(201).json(fullDossier.rows[0]);
    }
    catch (err) {
        console.error('❌ Erreur création :', err);
        res.status(500).json({ error: "Erreur lors de la création du dossier" });
    }
});
exports.creerDossier = creerDossier;
const listerDossiers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 200, 500);
        const cursor = parseInt(req.query.cursor) || 0;
        const status = req.query.status;
        let query = `${DOSSIER_SELECT} WHERE d.id > $1`;
        const params = [cursor];
        if (status) {
            query += ' AND d.status = $2';
            params.push(status);
        }
        query += ' ORDER BY d.id ASC LIMIT $' + (params.length + 1);
        params.push(limit);
        const result = yield db_1.default.query(query, params);
        res.status(200).json(result.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage :', err);
        res.status(500).json({ error: "Erreur lors de la récupération des dossiers" });
    }
});
exports.listerDossiers = listerDossiers;
const modifierDossier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { verdict, status, emplacement, numero_sortie, personne_sortie } = req.body;
    try {
        const check = yield db_1.default.query('SELECT status FROM dossiers WHERE id = $1', [id]);
        if (check.rows.length === 0)
            return res.status(404).json({ error: "Dossier introuvable" });
        if (estProtege(check.rows[0].status)) {
            return res.status(403).json({ error: "Ce dossier est archivé et ne peut plus être modifié." });
        }
    }
    catch (err) {
        console.error('❌ Erreur vérification statut :', err);
        return res.status(500).json({ error: "Erreur lors de la vérification" });
    }
    try {
        yield db_1.default.query(`UPDATE dossiers
       SET verdict = COALESCE($2, verdict),
           status  = COALESCE($3, status),
           emplacement = COALESCE($4, emplacement),
           numero_sortie = COALESCE($5, numero_sortie),
           personne_sortie = COALESCE($6, personne_sortie),
           date_modification = CURRENT_TIMESTAMP
       WHERE id = $1`, [id, verdict, status, emplacement, numero_sortie, personne_sortie]);
        const result = yield db_1.default.query(`${DOSSIER_SELECT} WHERE d.id = $1`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Dossier introuvable" });
        const dossier = result.rows[0];
        if (status === 'historique_sortie') {
            yield db_1.default.query(`INSERT INTO sorties (dossier_id, numero_sortie, personne_sortie, motif)
         VALUES ($1, $2, $3, 'Sortie manuelle')`, [id, dossier.numero_sortie || '', dossier.personne_sortie || '']);
        }
        try {
            (0, socket_1.getIO)().emit('dossiers:updated', { dossier });
        }
        catch (_) { }
        res.json(dossier);
    }
    catch (err) {
        console.error('❌ Erreur modification :', err);
        res.status(500).json({ error: "Erreur lors de la modification du dossier" });
    }
});
exports.modifierDossier = modifierDossier;
const modifierDossierComplet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const body = req.body;
    const num_chrono = body.num_chrono;
    const nom_association = body.nom_association;
    const siege = body.siege;
    const district = body.district;
    const president = body.president;
    const type_dossier = body.type_dossier;
    const sous_type = body.sous_type;
    const categorie = body.categorie;
    const emplacement = body.emplacement;
    const numero_sortie = body.numero_sortie;
    const personne_sortie = body.personne_sortie;
    const objet = body.objet;
    const abreviation = body.abreviation;
    try {
        const check = yield db_1.default.query('SELECT status, nom_association, district FROM dossiers WHERE id = $1', [id]);
        if (check.rows.length === 0)
            return res.status(404).json({ error: "Dossier introuvable" });
        if (estProtege(check.rows[0].status)) {
            return res.status(403).json({ error: "Ce dossier est archivé et ne peut plus être modifié." });
        }
        yield db_1.default.query(`UPDATE dossiers SET
        num_chrono = COALESCE($2, num_chrono),
        nom_association = COALESCE($3, nom_association),
        siege = COALESCE($4, siege),
        district = COALESCE($5, district),
        president = COALESCE($6, president),
        type_dossier = COALESCE($7, type_dossier),
        sous_type = COALESCE($8, sous_type),
        categorie = COALESCE($9, categorie),
        emplacement = COALESCE($10, emplacement),
        numero_sortie = COALESCE($11, numero_sortie),
        personne_sortie = COALESCE($12, personne_sortie),
        objet = COALESCE($13, objet),
        abreviation = COALESCE($14, abreviation),
        date_modification = CURRENT_TIMESTAMP
       WHERE id = $1`, [id, num_chrono, nom_association, siege, district, president, type_dossier, sous_type, categorie, emplacement, numero_sortie, personne_sortie, objet, abreviation]);
        yield ensureAssociationId(parseInt(id), nom_association || check.rows[0].nom_association, district || check.rows[0].district);
        yield syncCategories(parseInt(id), categorie);
        const result = yield db_1.default.query(`${DOSSIER_SELECT} WHERE d.id = $1`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Dossier introuvable" });
        try {
            (0, socket_1.getIO)().emit('dossiers:updated', { dossier: result.rows[0] });
        }
        catch (_) { }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('❌ Erreur modification complète :', err);
        res.status(500).json({ error: "Erreur lors de la modification du dossier" });
    }
});
exports.modifierDossierComplet = modifierDossierComplet;
const supprimerDossier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const check = yield db_1.default.query('SELECT status FROM dossiers WHERE id = $1', [id]);
        if (check.rows.length === 0)
            return res.status(404).json({ error: "Dossier introuvable" });
        if (estProtege(check.rows[0].status)) {
            return res.status(403).json({ error: "Ce dossier est archivé et ne peut plus être supprimé." });
        }
    }
    catch (err) {
        console.error('❌ Erreur vérification statut :', err);
        return res.status(500).json({ error: "Erreur lors de la vérification" });
    }
    try {
        yield db_1.default.query('DELETE FROM dossier_categories WHERE dossier_id = $1', [id]);
        yield db_1.default.query('DELETE FROM sorties WHERE dossier_id = $1', [id]);
        yield db_1.default.query('DELETE FROM annuaire_entries WHERE dossier_id = $1', [id]);
        const result = yield db_1.default.query('DELETE FROM dossiers WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Dossier introuvable" });
        try {
            (0, socket_1.getIO)().emit('dossiers:deleted', { id });
        }
        catch (_) { }
        res.json({ message: "Dossier supprimé", dossier: result.rows[0] });
    }
    catch (err) {
        console.error('❌ Erreur suppression :', err);
        res.status(500).json({ error: "Erreur lors de la suppression du dossier" });
    }
});
exports.supprimerDossier = supprimerDossier;
const listerDossiersParStatut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const statut = req.params.statut;
    try {
        const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
        const cursor = parseInt(req.query.cursor) || 0;
        const result = yield db_1.default.query(`${DOSSIER_SELECT} WHERE d.status = $1 AND d.id > $2 ORDER BY d.date_depot DESC LIMIT $3`, [statut, cursor, limit]);
        res.status(200).json(result.rows);
    }
    catch (err) {
        console.error('❌ Erreur listage par statut :', err);
        res.status(500).json({ error: "Erreur lors de la récupération des dossiers" });
    }
});
exports.listerDossiersParStatut = listerDossiersParStatut;
const creerDuplicata = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { num_chrono, nom_association, siege, district, president, type_dossier, categorie, arn, recu_fr, recu_mg, heure_depot, objet, abreviation, numero_sortie } = req.body;
    if (num_chrono) {
        try {
            const check = yield db_1.default.query('SELECT status FROM dossiers WHERE num_chrono = $1', [num_chrono]);
            if (check.rows.length > 0 && estProtege(check.rows[0].status)) {
                return res.status(403).json({ error: "Ce numéro correspond à un dossier archivé. Impossible de créer un duplicata." });
            }
        }
        catch (err) {
            console.error('❌ Erreur vérification statut :', err);
        }
    }
    try {
        const nouveau = yield db_1.default.query(`INSERT INTO dossiers (num_chrono, nom_association, siege, district, president, type_dossier, categorie, arn, recu_fr, recu_mg, heure_depot, status, verdict, objet, abreviation, numero_sortie)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'duplicata', 'aucun', $12, $13, $14) RETURNING id`, [num_chrono, nom_association || '', siege || '', district || '', president || '', type_dossier || '', categorie || '', arn || '', recu_fr || '', recu_mg || '', heure_depot || '', objet || '', abreviation || '', numero_sortie || '']);
        yield ensureAssociationId(nouveau.rows[0].id, nom_association, district);
        yield syncCategories(nouveau.rows[0].id, categorie);
        const fullDossier = yield db_1.default.query(`${DOSSIER_SELECT} WHERE d.id = $1`, [nouveau.rows[0].id]);
        try {
            (0, socket_1.getIO)().emit('dossiers:created', { dossier: fullDossier.rows[0] });
        }
        catch (_) { }
        res.status(201).json(fullDossier.rows[0]);
    }
    catch (err) {
        console.error('Erreur création duplicata', err);
        res.status(500).json({ error: 'Erreur création duplicata' });
    }
});
exports.creerDuplicata = creerDuplicata;
const approuverDuplicata = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield db_1.default.query("UPDATE dossiers SET status = 'reception' WHERE id = $1 AND status = 'duplicata'", [id]);
        const result = yield db_1.default.query(`${DOSSIER_SELECT} WHERE d.id = $1`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Duplicata introuvable ou déjà approuvé' });
        try {
            (0, socket_1.getIO)().emit('dossiers:updated', { dossier: result.rows[0] });
        }
        catch (_) { }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('Erreur approbation duplicata', err);
        res.status(500).json({ error: 'Erreur approbation' });
    }
});
exports.approuverDuplicata = approuverDuplicata;
const listerDuplicatas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`${DOSSIER_SELECT} WHERE d.status = 'duplicata' ORDER BY d.date_depot ASC`);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Erreur listage duplicatas', err);
        res.status(500).json({ error: 'Erreur listage' });
    }
});
exports.listerDuplicatas = listerDuplicatas;
const getDossiersParCategorieCtrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categorie = req.params.categorie;
        const annee = req.query.annee;
        let query = `${DOSSIER_SELECT}
      JOIN dossier_categories dc ON dc.dossier_id = d.id
      JOIN categories c ON c.id = dc.categorie_id
      WHERE c.nom ILIKE $1`;
        const params = [categorie];
        if (annee && /^\d{4}$/.test(annee)) {
            query += ' AND EXTRACT(YEAR FROM d.date_depot) = $2';
            params.push(parseInt(annee));
        }
        query += ' ORDER BY d.date_depot DESC';
        const result = yield db_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Erreur getDossiersParCategorieCtrl:', err);
        res.status(500).json({ error: 'Erreur récupération dossiers par catégorie' });
    }
});
exports.getDossiersParCategorieCtrl = getDossiersParCategorieCtrl;
const getDossiersParDistrictCtrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const district = req.params.district;
        const annee = req.query.annee;
        let query = `${DOSSIER_SELECT} WHERE a.id IS NOT NULL AND a.district ILIKE $1`;
        const params = [district];
        if (annee && /^\d{4}$/.test(annee)) {
            query += ' AND EXTRACT(YEAR FROM d.date_depot) = $2';
            params.push(parseInt(annee));
        }
        query += ' ORDER BY d.date_depot DESC';
        const result = yield db_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Erreur getDossiersParDistrictCtrl:', err);
        res.status(500).json({ error: 'Erreur récupération dossiers par district' });
    }
});
exports.getDossiersParDistrictCtrl = getDossiersParDistrictCtrl;
const getDossiersParTypeCtrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const type = req.params.type;
        const annee = req.query.annee;
        let query = `${DOSSIER_SELECT} WHERE d.type_dossier ILIKE $1`;
        const params = [type];
        if (annee && /^\d{4}$/.test(annee)) {
            query += ' AND EXTRACT(YEAR FROM d.date_depot) = $2';
            params.push(parseInt(annee));
        }
        query += ' ORDER BY d.date_depot DESC';
        const result = yield db_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Erreur getDossiersParTypeCtrl:', err);
        res.status(500).json({ error: 'Erreur récupération dossiers par type' });
    }
});
exports.getDossiersParTypeCtrl = getDossiersParTypeCtrl;
const listerDossiersParStatuts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statutsParam = req.query.statuts;
        const statusList = statutsParam ? statutsParam.split(',') : ['annuaire', 'archive_annuaire', 'registre_chrono'];
        const placeholders = statusList.map((_, i) => `$${i + 1}`).join(', ');
        const query = `${DOSSIER_SELECT} WHERE d.status IN (${placeholders}) ORDER BY d.categorie, d.nom_association`;
        const result = yield db_1.default.query(query, statusList);
        res.status(200).json(result.rows);
    }
    catch (err) {
        console.error('Erreur listage par statuts :', err);
        res.status(500).json({ error: "Erreur lors de la récupération des dossiers" });
    }
});
exports.listerDossiersParStatuts = listerDossiersParStatuts;
const archiverSortie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { dossierIds } = req.body;
    if (!dossierIds || !Array.isArray(dossierIds) || dossierIds.length === 0) {
        return res.status(400).json({ error: "Liste d'IDs de dossiers requise" });
    }
    try {
        const checks = yield db_1.default.query('SELECT id, status FROM dossiers WHERE id = ANY($1::int[])', [dossierIds]);
        for (const row of checks.rows) {
            if (estProtege(row.status)) {
                return res.status(403).json({ error: `Le dossier ${row.id} est archivé et ne peut pas être archivé en sortie.` });
            }
        }
    }
    catch (err) {
        console.error('❌ Erreur vérification statut :', err);
        return res.status(500).json({ error: "Erreur lors de la vérification" });
    }
    try {
        const result = yield db_1.default.query(`SELECT d.* FROM dossiers d
       WHERE d.id = ANY($1::int[])
         AND EXISTS (SELECT 1 FROM annuaire_entries ae WHERE ae.dossier_id = d.id)`, [dossierIds]);
        const dossiersAArchiver = result.rows;
        if (dossiersAArchiver.length === 0) {
            return res.json({
                message: "Aucun dossier trouvé dans l'annuaire à archiver en sortie",
                archivedCount: 0,
                skippedCount: dossierIds.length,
            });
        }
        const targetIds = dossiersAArchiver.map(d => d.id);
        for (const d of dossiersAArchiver) {
            yield db_1.default.query(`INSERT INTO sorties (dossier_id, numero_sortie, personne_sortie, motif)
         VALUES ($1, $2, $3, 'Archivage sortie')`, [d.id, d.numero_sortie || '', d.personne_sortie || '']);
        }
        yield db_1.default.query("UPDATE dossiers SET status = 'historique_sortie', date_modification = CURRENT_TIMESTAMP WHERE id = ANY($1::int[])", [targetIds]);
        try {
            (_a = (0, socket_1.getIO)()) === null || _a === void 0 ? void 0 : _a.emit('dossiers:archived', { ids: targetIds });
        }
        catch (_) { }
        try {
            (_b = (0, socket_1.getIO)()) === null || _b === void 0 ? void 0 : _b.emit('dossiers:updated', { ids: targetIds, status: 'historique_sortie' });
        }
        catch (_) { }
        const skippedCount = dossierIds.length - dossiersAArchiver.length;
        let message = `${dossiersAArchiver.length} dossier(s) archivé(s) dans l'historique de sortie`;
        if (skippedCount > 0)
            message += `. ${skippedCount} dossier(s) ignoré(s) car non présent(s) dans l'annuaire.`;
        res.json({ message, archivedCount: dossiersAArchiver.length, skippedCount });
    }
    catch (err) {
        console.error('Erreur archivage sortie :', err);
        res.status(500).json({ error: "Erreur lors de l'archivage en sortie" });
    }
});
exports.archiverSortie = archiverSortie;
// ============================================================
// HELPERS STATS
// ============================================================
const buildDateClause = (col, anneeVal, moisVal, params) => {
    if (moisVal) {
        params.push(moisVal);
        return ` WHERE TO_CHAR(${col}, 'YYYY-MM') = $${params.length}`;
    }
    if (anneeVal) {
        params.push(parseInt(anneeVal));
        return ` WHERE EXTRACT(YEAR FROM ${col}) = $${params.length}`;
    }
    return '';
};
const buildDateClauseAnd = (col, anneeVal, moisVal, params) => {
    if (moisVal) {
        params.push(moisVal);
        return ` AND TO_CHAR(${col}, 'YYYY-MM') = $${params.length}`;
    }
    if (anneeVal) {
        params.push(parseInt(anneeVal));
        return ` AND EXTRACT(YEAR FROM ${col}) = $${params.length}`;
    }
    return '';
};
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const anneeVal = /^\d{4}$/.test(String(req.query.annee || '')) ? String(req.query.annee) : null;
        const moisVal = /^\d{4}-\d{2}$/.test(String(req.query.mois || '')) ? String(req.query.mois) : null;
        let p = [];
        const dossiersWhere = buildDateClause('d.date_depot', anneeVal, moisVal, p);
        const total = yield db_1.default.query(`SELECT COUNT(*) FROM dossiers d${dossiersWhere}`, p);
        p = [];
        const parStatut = yield db_1.default.query(`SELECT d.status, COUNT(*) FROM dossiers d${buildDateClause('d.date_depot', anneeVal, moisVal, p)} GROUP BY d.status`, p);
        p = [];
        const parMois = yield db_1.default.query(`SELECT TO_CHAR(d.date_depot, 'YYYY-MM') as mois, COUNT(*) FROM dossiers d${buildDateClause('d.date_depot', anneeVal, moisVal, p)} GROUP BY mois ORDER BY mois`, p);
        p = [];
        const districtWhere = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
        const parDistrict = yield db_1.default.query(`SELECT a.district, COUNT(*) as count
       FROM dossiers d
       JOIN associations a ON a.id = d.association_id
       WHERE a.district IS NOT NULL AND a.district != ''${districtWhere}
       GROUP BY a.district`, p);
        p = [];
        const catWhere = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
        const parCategorie = yield db_1.default.query(`SELECT c.nom as categorie, COUNT(*) as count
       FROM dossiers d
       JOIN dossier_categories dc ON dc.dossier_id = d.id
       JOIN categories c ON c.id = dc.categorie_id${catWhere}
       GROUP BY c.nom
       ORDER BY count DESC`, p);
        p = [];
        const catDetailWhere = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
        const parCategorieDetail = yield db_1.default.query(`SELECT c.nom as categorie, d.status, COUNT(*) as count
       FROM dossiers d
       JOIN dossier_categories dc ON dc.dossier_id = d.id
       JOIN categories c ON c.id = dc.categorie_id${catDetailWhere}
       GROUP BY c.nom, d.status
       ORDER BY c.nom, d.status`, p);
        const totalParAnnee = yield db_1.default.query(`SELECT EXTRACT(YEAR FROM date_depot) as annee, COUNT(*) as count FROM dossiers GROUP BY annee ORDER BY annee DESC`);
        const pipeline = yield db_1.default.query(`SELECT status, COUNT(*) as count FROM dossiers GROUP BY status`);
        const pipeMap = {};
        for (const row of pipeline.rows) {
            pipeMap[row.status] = parseInt(row.count);
        }
        const enAttente = (pipeMap['en_attente'] || 0);
        const receptionFav = yield (() => __awaiter(void 0, void 0, void 0, function* () {
            const qp = [];
            const where = buildDateClause('date_depot', anneeVal, moisVal, qp);
            const prefix = where || 'WHERE';
            const connector = where ? 'AND' : '';
            const r = yield db_1.default.query(`SELECT COUNT(*) FROM dossiers ${prefix} ${connector} status = 'reception' AND verdict = 'favorable'`, qp);
            return parseInt(r.rows[0].count);
        }))();
        const registreChrono = (pipeMap['registre_chrono'] || 0) +
            (pipeMap['archive_arrivee'] || 0) +
            (pipeMap['historique_sortie'] || 0) +
            (pipeMap['defavorable_traite'] || 0);
        p = [];
        const annuaireWhere = buildDateClause('d.date_depot', anneeVal, moisVal, p);
        const annuaireTotal = yield db_1.default.query(`SELECT COUNT(*) FROM dossiers d JOIN annuaire_entries ae ON ae.dossier_id = d.id${annuaireWhere}`, p);
        p = [];
        const annuaireParCategorie = yield db_1.default.query(`SELECT c.nom as categorie, COUNT(*) as count
       FROM dossiers d
       JOIN annuaire_entries ae ON ae.dossier_id = d.id
       JOIN dossier_categories dc ON dc.dossier_id = d.id
       JOIN categories c ON c.id = dc.categorie_id${buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p)}
       GROUP BY c.nom`, p);
        p = [];
        const typeWhere = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
        const parTypeDossier = yield db_1.default.query(`SELECT d.type_dossier, COUNT(*) as count FROM dossiers d WHERE d.type_dossier IS NOT NULL AND d.type_dossier != ''${typeWhere} GROUP BY d.type_dossier ORDER BY count DESC`, p);
        p = [];
        const histoArriveeWhere = buildDateClause('ha.date_arrivee', anneeVal, moisVal, p);
        const histoArriveeTotal = yield db_1.default.query(`SELECT COUNT(*) FROM historique_arrivee ha${histoArriveeWhere}`, p);
        p = [];
        const histoDefWhere = buildDateClause('hd.date_arrivee', anneeVal, moisVal, p);
        const histoDefavorableTotal = yield db_1.default.query(`SELECT COUNT(*) FROM historique_defavorable hd${histoDefWhere}`, p);
        res.json({
            total: total.rows[0].count,
            parStatut: parStatut.rows,
            parMois: parMois.rows,
            parDistrict: parDistrict.rows,
            parCategorie: parCategorie.rows,
            parCategorieDetail: parCategorieDetail.rows,
            totalParAnnee: totalParAnnee.rows,
            parTypeDossier: parTypeDossier.rows,
            annuaireParCategorie: annuaireParCategorie.rows,
            pipeline: {
                reception: pipeMap['reception'] || 0,
                en_attente: enAttente + receptionFav,
                en_cours: pipeMap['en_cours'] || 0,
                livraison: pipeMap['livraison'] || 0,
                defavorable: pipeMap['defavorable'] || 0,
                registre_chrono: registreChrono,
                historique_sortie: pipeMap['historique_sortie'] || 0,
                duplicata: pipeMap['duplicata'] || 0,
                defavorable_traite: pipeMap['defavorable_traite'] || 0,
                archive_arrivee: pipeMap['archive_arrivee'] || 0,
                annuaire: parseInt(annuaireTotal.rows[0].count),
                historique_arrivee: parseInt(histoArriveeTotal.rows[0].count),
                historique_defavorable: parseInt(histoDefavorableTotal.rows[0].count),
            },
        });
    }
    catch (err) {
        console.error('Erreur stats', err);
        res.status(500).json({ error: 'Erreur statistiques' });
    }
});
exports.getStats = getStats;
const listerSorties = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dossierId = req.query.dossier_id;
        let query = `
      SELECT s.*, d.num_chrono, COALESCE(a.nom, d.nom_association, '') AS association_nom
      FROM sorties s
      JOIN dossiers d ON d.id = s.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
    `;
        const params = [];
        if (dossierId) {
            query += ' WHERE s.dossier_id = $1';
            params.push(parseInt(dossierId));
        }
        query += ' ORDER BY s.date_sortie DESC';
        const result = yield db_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Erreur listage sorties', err);
        res.status(500).json({ error: 'Erreur récupération sorties' });
    }
});
exports.listerSorties = listerSorties;
