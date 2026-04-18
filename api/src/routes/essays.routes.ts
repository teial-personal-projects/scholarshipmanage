import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import * as essaysController from '../controllers/essays.controller.js';
import * as collaborationsController from '../controllers/collaborations.controller.js';

const router = Router();

// All routes require authentication and student role
router.use(auth);
router.use(requireRole(['student']));

// Nested collaborations routes - must come before /:id route
// GET /api/essays/:essayId/collaborations - Deprecated (essayReview no longer stores essayId)
router.get('/:essayId/collaborations', collaborationsController.getCollaborationsByEssay);

// GET /api/essays/:id - Get essay details
router.get('/:id', essaysController.getEssay);

// PATCH /api/essays/:id - Update essay
router.patch('/:id', essaysController.updateEssay);

// DELETE /api/essays/:id - Delete essay
router.delete('/:id', essaysController.deleteEssay);

export default router;

