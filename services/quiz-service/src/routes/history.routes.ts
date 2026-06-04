import { Router } from 'express';
import { historyController } from '../controllers/history.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.use(requireAuth);

router.get(
  '/organized',
  asyncHandler((req, res) => historyController.organized(req as AuthRequest, res))
);

router.get(
  '/participated',
  asyncHandler((req, res) => historyController.participated(req as AuthRequest, res))
);

router.get(
  '/sessions/:sessionId',
  asyncHandler((req, res) => historyController.sessionDetail(req as AuthRequest, res))
);

export default router;
