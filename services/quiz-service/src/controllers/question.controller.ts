import { Response } from 'express';
import { questionService } from '../services/question.service';
import { AuthRequest, AnswerOptionInput, CreateQuestionInput } from '../types';
import { createSuccessResponse, HTTP_STATUS } from '../utils/errors';

export const questionController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const question = await questionService.create(
      req.params.quizId,
      req.user!.id,
      req.body as CreateQuestionInput
    );
    res.status(HTTP_STATUS.CREATED).json(createSuccessResponse({ question }));
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    const question = await questionService.update(
      req.params.id,
      req.user!.id,
      req.body as Partial<CreateQuestionInput>
    );
    res.json(createSuccessResponse({ question }));
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    await questionService.delete(req.params.id, req.user!.id);
    res.json(createSuccessResponse({ message: 'Question deleted' }));
  },

  async replaceOptions(req: AuthRequest, res: Response): Promise<void> {
    const { options } = req.body as { options: AnswerOptionInput[] };
    const question = await questionService.replaceOptions(
      req.params.id,
      req.user!.id,
      options
    );
    res.json(createSuccessResponse({ question }));
  },
};
