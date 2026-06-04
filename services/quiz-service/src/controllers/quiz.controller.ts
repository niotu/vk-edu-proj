import { Response } from 'express';
import { quizService } from '../services/quiz.service';
import { AuthRequest, CreateQuizInput, UpdateQuizInput } from '../types';
import { createSuccessResponse, HTTP_STATUS } from '../utils/errors';

export const quizController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const quizzes = await quizService.listByOrganizer(req.user!.id);
    res.json(createSuccessResponse({ quizzes }));
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    const quiz = await quizService.create(req.user!.id, req.body as CreateQuizInput);
    res.status(HTTP_STATUS.CREATED).json(createSuccessResponse({ quiz }));
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const quiz = await quizService.getById(req.params.id, req.user!.id);
    res.json(createSuccessResponse({ quiz }));
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    const quiz = await quizService.update(
      req.params.id,
      req.user!.id,
      req.body as UpdateQuizInput
    );
    res.json(createSuccessResponse({ quiz }));
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    await quizService.delete(req.params.id, req.user!.id);
    res.json(createSuccessResponse({ message: 'Quiz deleted' }));
  },

  async publish(req: AuthRequest, res: Response): Promise<void> {
    const quiz = await quizService.publish(req.params.id, req.user!.id);
    res.json(createSuccessResponse({ quiz }));
  },
};
