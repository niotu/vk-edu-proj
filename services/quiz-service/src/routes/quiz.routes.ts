import { Router } from 'express';
import { quizController } from '../controllers/quiz.controller';
import { questionController } from '../controllers/question.controller';
import { requireAuth, requireOrganizer } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.use(requireAuth, requireOrganizer);

router.get('/', asyncHandler((req, res) => quizController.list(req as AuthRequest, res)));
router.post('/', asyncHandler((req, res) => quizController.create(req as AuthRequest, res)));
router.get('/:id', asyncHandler((req, res) => quizController.getById(req as AuthRequest, res)));
router.patch('/:id', asyncHandler((req, res) => quizController.update(req as AuthRequest, res)));
router.delete('/:id', asyncHandler((req, res) => quizController.remove(req as AuthRequest, res)));
router.post('/:id/publish', asyncHandler((req, res) => quizController.publish(req as AuthRequest, res)));

router.post(
  '/:quizId/questions',
  asyncHandler((req, res) => questionController.create(req as AuthRequest, res))
);

export default router;
