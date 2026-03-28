import express from 'express';
import { fetchSettings, saveSettings } from '../controllers/BlockerController.js';

/**
 * BlockerRoutes.js
 *
 * GET  /api/blocker/:userId  →  fetchSettings
 * POST /api/blocker          →  saveSettings
 */

const router = express.Router();

router.get('/:userId', fetchSettings);
router.post('/',       saveSettings);

export default router;
