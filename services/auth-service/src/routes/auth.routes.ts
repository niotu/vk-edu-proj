import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.post('/register', asyncHandler((req, res) => authController.register(req as AuthRequest, res)));
router.post('/login', asyncHandler((req, res) => authController.login(req as AuthRequest, res)));
router.post('/refresh', asyncHandler((req, res) => authController.refresh(req as AuthRequest, res)));
router.post('/logout', (req, res) => authController.logout(req as AuthRequest, res));
router.get('/me', authenticate, asyncHandler((req, res) => authController.me(req as AuthRequest, res)));

export default router;
