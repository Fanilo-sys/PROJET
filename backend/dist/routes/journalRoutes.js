"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const journalController_1 = require("../controllers/journalController");
const router = (0, express_1.Router)();
router.get('/', journalController_1.listerJournal);
exports.default = router;
