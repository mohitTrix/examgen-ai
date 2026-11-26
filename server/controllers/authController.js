import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import * as v from '../utils/validators.js';

export const publicUser = (u) => ({
  id: String(u._id), name: u.name, email: u.email, role: u.role, institution: u.institution, preferences: u.preferences,
});

export const signup = asyncHandler(async (req, res) => {
  const name = v.str(req.body?.name, 'Name', { min: 2, max: 80 });
  const email = v.email(req.body?.email);
  const password = v.password(req.body?.password);
  const role = v.oneOf(req.body?.role ?? 'student', 'Role', ['student', 'teacher']);
  if (await User.findOne({ email })) throw new HttpError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const email = v.email(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Incorrect email or password.');
  res.json({ token: signToken(user), user: publicUser(user) });
});

export const me = (req, res) => res.json({ user: publicUser(req.user) });

export const updateProfile = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (b.name !== undefined) req.user.name = v.str(b.name, 'Name', { min: 2, max: 80 });
  if (b.role !== undefined) req.user.role = v.oneOf(b.role, 'Role', ['student', 'teacher']);
  if (b.institution !== undefined) req.user.institution = v.str(b.institution, 'Institution', { min: 0, max: 150 });
  if (b.preferences) {
    req.user.preferences.defaultDifficulty = v.oneOf(b.preferences.defaultDifficulty, 'Difficulty', ['easy', 'medium', 'hard', 'mixed']);
    req.user.preferences.defaultExam = v.oneOf(b.preferences.defaultExam, 'Exam', ['GATE', 'JEE', 'NEET', 'UPSC', 'University', 'Custom']);
  }
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Also signs out every other session by bumping tokenVersion
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(String(req.body?.currentPassword || ''), user.passwordHash)))
    throw new HttpError(400, 'Current password is incorrect.');
  user.passwordHash = await bcrypt.hash(v.password(req.body?.newPassword), 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({ token: signToken(user), user: publicUser(user) });
});
