import { Response } from 'express';
import { sessionService } from '../services/session.service';
import { AuthRequest } from '../types';
import { createSuccessResponse, HTTP_STATUS } from '../utils/errors';

export const sessionController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const { quizId } = req.body as { quizId: string };
    if (!quizId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'quizId is required',
        code: 'INVALID_INPUT',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const session = await sessionService.create(req.user!.id, quizId);
    res.status(HTTP_STATUS.CREATED).json(createSuccessResponse({ session }));
  },

  async getByRoomCode(req: AuthRequest, res: Response): Promise<void> {
    const session = await sessionService.getByRoomCode(req.params.roomCode);
    res.json(createSuccessResponse({ session }));
  },

  async join(req: AuthRequest, res: Response): Promise<void> {
    const result = await sessionService.join(req.params.id, req.user!.id);
    res.json(createSuccessResponse(result));
  },

  async start(req: AuthRequest, res: Response): Promise<void> {
    const session = await sessionService.start(req.params.id, req.user!.id);
    res.json(createSuccessResponse({ session }));
  },

  async showQuestion(req: AuthRequest, res: Response): Promise<void> {
    const result = await sessionService.showQuestion(
      req.params.id,
      req.params.questionId,
      req.user!.id
    );
    res.json(createSuccessResponse(result));
  },

  async closeQuestion(req: AuthRequest, res: Response): Promise<void> {
    const session = await sessionService.closeQuestion(req.params.id, req.user!.id);
    res.json(createSuccessResponse({ session }));
  },

  async submitAnswer(req: AuthRequest, res: Response): Promise<void> {
    const { questionId, selectedOptionIds } = req.body as {
      questionId: string;
      selectedOptionIds: string[];
    };
    const result = await sessionService.submitAnswer(
      req.params.id,
      req.user!.id,
      questionId,
      selectedOptionIds ?? []
    );
    res.json(createSuccessResponse(result));
  },

  async end(req: AuthRequest, res: Response): Promise<void> {
    const result = await sessionService.end(req.params.id, req.user!.id);
    res.json(createSuccessResponse(result));
  },

  async leaderboard(req: AuthRequest, res: Response): Promise<void> {
    const result = await sessionService.getLeaderboard(req.params.id);
    res.json(createSuccessResponse(result));
  },
};
