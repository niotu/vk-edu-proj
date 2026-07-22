import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.use(requireAuth);

router.get(
  '/by-code/:roomCode',
  asyncHandler((req, res) => sessionController.getByRoomCode(req as AuthRequest, res))
);

router.post(
  '/',
  asyncHandler((req, res) => sessionController.create(req as AuthRequest, res))
);

router.post(
  '/:id/join',
  asyncHandler((req, res) => sessionController.join(req as AuthRequest, res))
);

router.get(
  '/:id/leaderboard',
  asyncHandler((req, res) => sessionController.leaderboard(req as AuthRequest, res))
);

router.get(
  '/:id/state',
  asyncHandler((req, res) => sessionController.state(req as AuthRequest, res))
);

router.post(
  '/:id/answers',
  asyncHandler((req, res) => sessionController.submitAnswer(req as AuthRequest, res))
);

router.post(
  '/:id/start',
  asyncHandler((req, res) => sessionController.start(req as AuthRequest, res))
);

router.post(
  '/:id/questions/:questionId/show',
  asyncHandler((req, res) => sessionController.showQuestion(req as AuthRequest, res))
);

router.post(
  '/:id/questions/close',
  asyncHandler((req, res) => sessionController.closeQuestion(req as AuthRequest, res))
);

router.post(
  '/:id/end',
  asyncHandler((req, res) => sessionController.end(req as AuthRequest, res))
);

export default router;
