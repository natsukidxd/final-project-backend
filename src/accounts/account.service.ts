import { db } from '../_helpers/db';
import { Role } from '../_helpers/role';
import { sendEmail } from '../_helpers/send-email';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const jwtExpiration = 15 * 60; // 15 minutes

export const accountService = {
  register,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  authenticate,
  refreshToken,
  revokeToken,
  getAll,
  getById,
  update,
  delete: _delete
};

async function register(params: any) {
  // Validate
  if (await db.Account.findOne({ where: { email: params.email } })) {
    throw 'Email "' + params.email + '" is already registered';
  }

  // Create account
  const account = new db.Account({
    email: params.email,
    passwordHash: bcrypt.hashSync(params.password, 10),
    title: params.title,
    firstName: params.firstName,
    lastName: params.lastName,
    role: (await db.Account.count()) === 0 ? Role.Admin : Role.User,
    verificationToken: uuidv4()
  });

  await account.save();

  // Send verification email (non-blocking — don't fail registration if email fails)
  try {
    await sendVerificationEmail(account);
  } catch (emailErr: any) {
    console.error('Failed to send verification email:', emailErr?.message || emailErr);
  }
}

async function sendVerificationEmail(account: any) {
  const verifyUrl = `${process.env.CORS_ORIGIN || 'http://localhost:4200'}/account/verify-email?token=${account.verificationToken}`;
  await sendEmail({
    to: account.email,
    subject: 'Verify Email',
    html: `<h4>Verify Email</h4>
           <p>Thanks for registering! Please click the below link to verify your email address:</p>
           <p><a href="${verifyUrl}">${verifyUrl}</a></p>`
  });
}

async function verifyEmail({ token }: { token: string }) {
  const account = await db.Account.findOne({ where: { verificationToken: token } });
  if (!account) throw 'Verification failed';

  account.verified = new Date();
  account.verificationToken = null;
  await account.save();
}

async function forgotPassword({ email }: { email: string }) {
  const account = await db.Account.findOne({ where: { email } });
  if (!account) return;

  account.resetToken = uuidv4();
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await account.save();

  const resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:4200'}/account/reset-password?token=${account.resetToken}`;

  // Send password reset email (non-blocking)
  try {
    await sendEmail({
      to: account.email,
      subject: 'Reset Password',
      html: `<h4>Reset Password</h4>
             <p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>`
    });
  } catch (emailErr: any) {
    console.error('Failed to send password reset email:', emailErr?.message || emailErr);
  }
}

async function validateResetToken({ token }: { token: string }) {
  const account = await db.Account.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [db.Sequelize.Op.gt]: new Date() }
    }
  });
  if (!account) throw 'Invalid token';
}

async function resetPassword({ token, password }: { token: string; password: string }) {
  const account = await db.Account.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [db.Sequelize.Op.gt]: new Date() }
    }
  });
  if (!account) throw 'Invalid token';

  account.passwordHash = bcrypt.hashSync(password, 10);
  account.passwordReset = new Date();
  account.resetToken = null;
  account.resetTokenExpires = null;
  await account.save();
}

async function authenticate({ email, password, ipAddress }: { email: string; password: string; ipAddress: string }) {
  const account = await db.Account.scope('withHash').findOne({ where: { email } });

  if (!account || !bcrypt.compareSync(password, account.passwordHash)) {
    throw 'Email or password is incorrect';
  }

  if (!account.verified) {
    throw 'Please verify your email before logging in';
  }

  // Generate tokens
  const jwtToken = generateJwtToken(account);
  const refreshToken = await generateRefreshToken(account, ipAddress);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: refreshToken.token
  };
}

async function refreshToken({ token, ipAddress }: { token: string; ipAddress: string }) {
  const refreshToken = await db.RefreshToken.findOne({ where: { token } });
  const account = refreshToken ? await db.Account.findByPk(refreshToken.accountId) : null;

  if (!refreshToken || !refreshToken.isActive || !account) {
    throw 'Invalid token';
  }

  // Revoke current token and create new one (rotation)
  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();

  const newRefreshToken = await generateRefreshToken(account, ipAddress);
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();

  const jwtToken = generateJwtToken(account);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: newRefreshToken.token
  };
}

async function revokeToken({ token, ipAddress, user }: { token: string; ipAddress: string; user: any }) {
  const refreshToken = await db.RefreshToken.findOne({ where: { token } });
  const account = refreshToken ? await db.Account.findByPk(refreshToken.accountId) : null;

  if (!refreshToken || !refreshToken.isActive || !account) {
    throw 'Invalid token';
  }

  // Check ownership
  if (user.role !== Role.Admin && refreshToken.accountId !== user.id) {
    throw 'Unauthorized';
  }

  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function getAll() {
  const accounts = await db.Account.findAll();
  return accounts.map((x: any) => basicDetails(x));
}

async function getById(id: number) {
  const account = await getAccount(id);
  return basicDetails(account);
}

async function update(id: number, params: any) {
  const account = await getAccount(id);

  // Validate email change
  if (params.email && params.email !== account.email &&
    await db.Account.findOne({ where: { email: params.email } })) {
    throw 'Email "' + params.email + '" is already taken';
  }

  // Hash password if provided
  if (params.password) {
    params.passwordHash = bcrypt.hashSync(params.password, 10);
  }

  Object.assign(account, params);
  await account.save();

  return basicDetails(account);
}

async function _delete(id: number) {
  const account = await getAccount(id);
  await account.destroy();
}

// Helper functions

async function getAccount(id: number) {
  const account = await db.Account.findByPk(id);
  if (!account) throw 'Account not found';
  return account;
}

function generateJwtToken(account: any) {
  return jwt.sign({ id: account.id, sub: account.id, role: account.role }, jwtSecret, {
    expiresIn: jwtExpiration
  });
}

async function generateRefreshToken(account: any, ipAddress: string) {
  const token = uuidv4();
  const refreshToken = new db.RefreshToken({
    accountId: account.id,
    token,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress
  });
  await refreshToken.save();
  return refreshToken;
}

function basicDetails(account: any) {
  const { id, title, firstName, lastName, email, role, created, updated, verified } = account;
  return { id, title, firstName, lastName, email, role, created, updated, verified, isVerified: !!verified };
}