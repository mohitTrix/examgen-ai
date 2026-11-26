import path from 'node:path';
import { HttpError } from '../utils/httpError.js';

export const ALLOWED = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain'],
};
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARS = 600_000;

// Check the actual bytes, because file names and MIME types can be forged.
export function checkSignature(ext, buffer) {
  if (ext === '.pdf') return buffer.subarray(0, 5).toString() === '%PDF-';
  if (ext === '.docx') return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  return !buffer.includes(0);
}

export async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED[ext] || !checkSignature(ext, file.buffer))
    throw new HttpError(400, `${file.originalname}: not a valid PDF, DOCX or UTF-8 TXT file.`);
  let text;
  try {
    if (ext === '.pdf') {
      // Import the library file directly: the package index runs debug code under ESM
      const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
      text = (await pdf(file.buffer)).text;
    } else if (ext === '.docx') {
      const { default: mammoth } = await import('mammoth');
      text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    } else {
      text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    }
  } catch {
    throw new HttpError(422, `${file.originalname}: could not read this file. It may be damaged, password protected, or not UTF-8.`);
  }
  text = text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 200)
    throw new HttpError(422, `${file.originalname}: found too little text (at least 200 characters needed). Scanned images are not supported.`);
  return { text: text.slice(0, MAX_TEXT_CHARS), truncated: text.length > MAX_TEXT_CHARS };
}
