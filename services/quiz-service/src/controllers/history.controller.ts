import { Response } from 'express';
import { historyService } from '../services/history.service';
import { AuthRequest } from '../types';
import { AppError, createSuccessResponse, HTTP_STATUS } from '../utils/errors';

export const historyController = {
  async organized(req: AuthRequest, res: Response): Promise<void> {
    if (req.user!.role !== 'ORGANIZER') {
      throw new AppError('Organizer role required', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
    }
    const sessions = await historyService.listOrganized(req.user!.id);
    res.json(createSuccessResponse({ sessions }));
  },

  async participated(req: AuthRequest, res: Response): Promise<void> {
    const history = await historyService.listParticipated(req.user!.id);
    res.json(createSuccessResponse({ history }));
  },

  async sessionDetail(req: AuthRequest, res: Response): Promise<void> {
    const session = await historyService.getSessionDetail(req.params.sessionId, req.user!.id);
    res.json(createSuccessResponse({ session }));
  },
};
