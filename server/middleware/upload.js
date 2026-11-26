import path from 'node:path';
import multer from 'multer';
import { ALLOWED, MAX_FILE_BYTES } from '../services/documents.js';
import { HttpError } from '../utils/httpError.js';

// Files stay in memory and are discarded after text extraction; nothing is written to disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 3, fields: 0 },
  fileFilter(_req, file, cb) {
    const types = ALLOWED[path.extname(file.originalname).toLowerCase()];
    if (types?.includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Only PDF, DOCX and TXT files are allowed.'));
  },
});
