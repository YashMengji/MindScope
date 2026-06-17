import express from 'express';
import { fetchSettings, saveSettings } from '../controllers/BlockerController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

/**
 * BlockerRoutes.js
 *
 * GET  /api/blocker  →  fetchSettings (userId from JWT)
 * POST /api/blocker  →  saveSettings  (userId from JWT)
 */

const router = express.Router();

router.get('/', authMiddleware, fetchSettings);
router.post('/', authMiddleware, saveSettings);

export default router;
