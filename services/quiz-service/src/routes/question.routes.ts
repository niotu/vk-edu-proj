import { Router } from 'express';
import { questionController } from '../controllers/question.controller';
import { requireAuth, requireOrganizer } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.use(requireAuth, requireOrganizer);

router.patch('/:id', asyncHandler((req, res) => questionController.update(req as AuthRequest, res)));
router.delete('/:id', asyncHandler((req, res) => questionController.remove(req as AuthRequest, res)));
router.put('/:id/options', asyncHandler((req, res) => questionController.replaceOptions(req as AuthRequest, res)));

export default router;
