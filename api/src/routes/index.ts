import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import applicationsRoutes from './applications.routes.js';
import essaysRoutes from './essays.routes.js';
import collaboratorsRoutes from './collaborators.routes.js';
import collaborationsRoutes from './collaborations.routes.js';
import recommendationsRoutes from './recommendations.routes.js';
import webhooksRoutes from './webhooks.routes.js';
import cronRoutes from './cron.routes.js';
import resourcesRoutes from './resources.routes.js';

const router = Router();

// Mount route modules
// Auth routes (public, no auth middleware)
router.use('/auth', authRoutes);

// Webhook routes (public, use signature verification instead of auth)
router.use('/webhooks', webhooksRoutes);

// Cron routes (public, use secret token verification instead of auth)
router.use('/cron', cronRoutes);

// Protected routes (require authentication)
router.use('/users', usersRoutes);
router.use('/applications', applicationsRoutes);
router.use('/essays', essaysRoutes);
router.use('/collaborators', collaboratorsRoutes);
router.use('/collaborations', collaborationsRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/resources', resourcesRoutes);

export default router;
