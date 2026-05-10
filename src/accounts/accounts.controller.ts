import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validateRequest } from '../_middleware/validate-request';
import { authorize } from '../_middleware/authorize';
import { accountService } from './account.service';
import { Role } from '../_helpers/role';

const router = Router();

// Routes
router.post('/register', registerSchema, register);
router.post('/verify-email', verifyEmailSchema, verifyEmail);
router.post('/forgot-password', forgotPasswordSchema, forgotPassword);
router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken);
router.post('/reset-password', resetPasswordSchema, resetPassword);
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeTokenSchema, revokeToken);
router.get('/', authorize([Role.Admin]), getAll);
router.get('/:id', authorize(), getById);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(), _delete);

export { router as accountsController };

// Schema validation functions

function registerSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  });
  validateRequest(req, next, schema);
}

function verifyEmailSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    token: Joi.string().required()
  });
  validateRequest(req, next, schema);
}

function forgotPasswordSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });
  validateRequest(req, next, schema);
}

function validateResetTokenSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    token: Joi.string().required()
  });
  validateRequest(req, next, schema);
}

function resetPasswordSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  });
  validateRequest(req, next, schema);
}

function authenticateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required()
  });
  validateRequest(req, next, schema);
}

function revokeTokenSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    token: Joi.string().empty('')
  });
  validateRequest(req, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    title: Joi.string().empty(''),
    firstName: Joi.string().empty(''),
    lastName: Joi.string().empty(''),
    email: Joi.string().email().empty(''),
    password: Joi.string().min(6).empty(''),
    confirmPassword: Joi.string().valid(Joi.ref('password')).empty(''),
    role: Joi.string().valid(Role.Admin, Role.User).empty('')
  });
  validateRequest(req, next, schema);
}

// Route handler functions

function register(req: Request, res: Response, next: NextFunction) {
  accountService.register(req.body)
    .then((result: any) => res.json(result))
    .catch(next);
}

function verifyEmail(req: Request, res: Response, next: NextFunction) {
  accountService.verifyEmail(req.body)
    .then(() => res.json({ message: 'Verification successful, you can now login' }))
    .catch(next);
}

function forgotPassword(req: Request, res: Response, next: NextFunction) {
  accountService.forgotPassword(req.body)
    .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
    .catch(next);
}

function validateResetToken(req: Request, res: Response, next: NextFunction) {
  accountService.validateResetToken(req.body)
    .then(() => res.json({ message: 'Token is valid' }))
    .catch(next);
}

function resetPassword(req: Request, res: Response, next: NextFunction) {
  accountService.resetPassword(req.body)
    .then(() => res.json({ message: 'Password reset successful, you can now login' }))
    .catch(next);
}

function authenticate(req: Request, res: Response, next: NextFunction) {
  const ipAddress = (req.ip || '');
  accountService.authenticate({ ...req.body, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function refreshToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.refreshToken || '';
  if (!token) {
    return res.status(204).send(); // No token → no-op, no error logged
  }

  const ipAddress = (req.ip || '');

  accountService.refreshToken({ token, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function revokeToken(req: Request, res: Response, next: NextFunction) {
  const token = req.body.token || req.cookies?.refreshToken || '';
  const ipAddress = (req.ip || '');
  const user = (req as any).user;

  accountService.revokeToken({ token, ipAddress, user })
    .then(() => res.json({ message: 'Token revoked' }))
    .catch(next);
}

function getAll(req: Request, res: Response, next: NextFunction) {
  accountService.getAll()
    .then(accounts => res.json(accounts))
    .catch(next);
}

function getById(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id as string);
  const currentUser = (req as any).user;

  accountService.getById(id)
    .then(account => {
      if (currentUser.role !== Role.Admin && currentUser.id !== account.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      return res.json(account);
    })
    .catch(next);
}

function update(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id as string);
  const currentUser = (req as any).user;

  if (currentUser.role !== Role.Admin && currentUser.id !== id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  accountService.update(id, req.body)
    .then(account => res.json(account))
    .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id as string);
  const currentUser = (req as any).user;

  if (currentUser.role !== Role.Admin && currentUser.id !== id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  accountService.delete(id)
    .then(() => res.json({ message: 'Account deleted successfully' }))
    .catch(next);
}

// Helper functions

function setTokenCookie(res: Response, token: string) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAMESITE || 'lax') as 'lax' | 'strict' | 'none' | undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  };
  res.cookie('refreshToken', token, cookieOptions);
}