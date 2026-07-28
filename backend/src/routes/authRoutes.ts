import { Router } from 'express';
import { login } from '../controllers/authController';

const router = Router();

// Route de test

router.get('/test', (req, res) => {
  res.json({ message: 'La route auth fonctionne !' });
});

router.post('/login', login);

export default router;