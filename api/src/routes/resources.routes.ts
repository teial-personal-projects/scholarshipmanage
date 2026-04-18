import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as resourcesController from '../controllers/resources.controller.js';

const router = Router();

// All routes require authentication (but no specific role - all users can view resources)
router.use(auth);

// GET /api/resources - List enabled scholarship resources
router.get('/', resourcesController.getResources);

export default router;
