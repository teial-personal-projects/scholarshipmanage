import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import * as collaborationsController from '../controllers/collaborations.controller.js';

const router = Router();

// All routes require authentication and student role
router.use(auth);
router.use(requireRole(['student']));

// POST /api/collaborations - Create new collaboration
router.post('/', collaborationsController.createCollaboration);

// GET /api/collaborations/:id - Get collaboration details
router.get('/:id', collaborationsController.getCollaboration);

// PATCH /api/collaborations/:id - Update collaboration
router.patch('/:id', collaborationsController.updateCollaboration);

// DELETE /api/collaborations/:id - Delete collaboration
router.delete('/:id', collaborationsController.deleteCollaboration);

// POST /api/collaborations/:id/history - Add history entry
router.post('/:id/history', collaborationsController.addCollaborationHistory);

// GET /api/collaborations/:id/history - Get collaboration history
router.get('/:id/history', collaborationsController.getCollaborationHistory);

// POST /api/collaborations/:id/invite - Send invitation now
router.post('/:id/invite', collaborationsController.sendInvite);

// POST /api/collaborations/:id/invite/schedule - Schedule invitation for later
router.post('/:id/invite/schedule', collaborationsController.scheduleInvite);

// POST /api/collaborations/:id/invite/resend - Resend invitation
router.post('/:id/invite/resend', collaborationsController.resendInvite);

export default router;

