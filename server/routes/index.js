import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as auth from '../controllers/authController.js';
import * as materials from '../controllers/materialController.js';
import * as papers from '../controllers/paperController.js';
import * as attempts from '../controllers/attemptController.js';
import { stats } from '../controllers/statsController.js';

const limit = (windowMinutes, max, message) =>
  rateLimit({ windowMs: windowMinutes * 60_000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, message: { message } });
const authLimit = limit(15, 20, 'Too many attempts. Please wait 15 minutes.');
const aiLimit = limit(60, 30, 'Hourly AI limit reached. Please try again later.');
const uploadLimit = limit(60, 40, 'Too many uploads. Please try again later.');

const r = Router();
r.post('/auth/signup', authLimit, auth.signup);
r.post('/auth/login', authLimit, auth.login);

r.use(requireAuth);
r.get('/auth/me', auth.me);
r.patch('/users/me', auth.updateProfile);
r.put('/users/me/password', authLimit, auth.changePassword);

r.get('/materials', materials.listMaterials);
r.post('/materials', uploadLimit, upload.array('files', 3), materials.uploadMaterials);
r.get('/materials/:id', materials.previewMaterial);
r.delete('/materials/:id', materials.deleteMaterial);

r.get('/patterns', papers.patterns);
r.get('/papers', papers.listPapers);
r.post('/papers', aiLimit, papers.createPaper);
r.get('/papers/:id', papers.getPaper);
r.patch('/papers/:id', papers.updatePaper);
r.delete('/papers/:id', papers.deletePaper);
r.post('/papers/:id/regenerate', aiLimit, papers.regeneratePaper);
r.put('/papers/:id/questions/:qid', papers.editQuestion);
r.post('/papers/:id/questions/:qid/regenerate', aiLimit, papers.regenerateQuestion);

r.get('/attempts', attempts.listAttempts);
r.post('/attempts', attempts.startAttempt);
r.get('/attempts/:id', attempts.getAttempt);
r.put('/attempts/:id/progress', attempts.saveProgress);
r.post('/attempts/:id/submit', attempts.submitAttempt);
r.post('/attempts/:id/questions/:qid/regrade', aiLimit, attempts.retryGrading);
r.post('/attempts/:id/questions/:qid/self-grade', attempts.selfGrade);

r.get('/stats', stats);
export default r;
