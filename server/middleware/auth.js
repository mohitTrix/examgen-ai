import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), v: user.tokenVersion || 0 }, env.jwtSecret, { expiresIn: '7d', algorithm: 'HS256' });

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, 'Please log in.');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }
  const user = await User.findById(payload.sub);
  if (!user || (user.tokenVersion || 0) !== payload.v) throw new HttpError(401, 'Your session has ended. Please log in again.');
  req.user = user;
  next();
});
