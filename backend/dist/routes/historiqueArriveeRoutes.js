"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const historiqueArriveeController_1 = require("../controllers/historiqueArriveeController");
const router = (0, express_1.Router)();
router.post('/', historiqueArriveeController_1.archiverArrivee);
router.get('/groupes', historiqueArriveeController_1.listerGroupesArrivee);
router.get('/groupes/:groupeId', historiqueArriveeController_1.listerArriveesParGroupe);
exports.default = router;
