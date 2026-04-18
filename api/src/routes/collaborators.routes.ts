import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import * as collaboratorsController from '../controllers/collaborators.controller.js';

const router = Router();

// All routes require authentication and student role
router.use(auth);
router.use(requireRole(['student']));

// GET /api/collaborators - List user's collaborators
router.get('/', collaboratorsController.getCollaborators);

// POST /api/collaborators - Create new collaborator
router.post('/', collaboratorsController.createCollaborator);

// GET /api/collaborators/:id - Get collaborator details
router.get('/:id', collaboratorsController.getCollaborator);

// PATCH /api/collaborators/:id - Update collaborator
router.patch('/:id', collaboratorsController.updateCollaborator);

// DELETE /api/collaborators/:id - Delete collaborator
router.delete('/:id', collaboratorsController.deleteCollaborator);

export default router;

