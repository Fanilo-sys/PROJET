"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Route de test
router.get('/test', (req, res) => {
    res.json({ message: 'La route auth fonctionne !' });
});
router.post('/login', authController_1.login);
exports.default = router;
