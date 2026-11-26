import Material from '../models/Material.js';
import { extractText } from '../services/documents.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { isId } from '../utils/validators.js';

const MAX_PER_USER = 30;
const view = (m) => ({ id: String(m._id), filename: m.filename, size: m.size, charCount: m.charCount, truncated: m.truncated, createdAt: m.createdAt });

export const uploadMaterials = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'Choose at least one file.');
  if ((await Material.countDocuments({ user: req.user._id })) + req.files.length > MAX_PER_USER)
    throw new HttpError(400, `You can keep up to ${MAX_PER_USER} materials. Delete some first.`);
  // Extract everything before saving, so one bad file doesn't leave a partial upload
  const docs = [];
  for (const file of req.files) {
    const { text, truncated } = await extractText(file);
    docs.push({ user: req.user._id, filename: file.originalname.slice(0, 200), size: file.size, charCount: text.length, truncated, text });
  }
  const saved = await Material.insertMany(docs);
  res.status(201).json({ materials: saved.map(view) });
});

export const listMaterials = asyncHandler(async (req, res) => {
  const materials = await Material.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ materials: materials.map(view) });
});

export const previewMaterial = asyncHandler(async (req, res) => {
  const m = isId(req.params.id) && (await Material.findOne({ _id: req.params.id, user: req.user._id }).select('+text'));
  if (!m) throw new HttpError(404, 'Material not found.');
  res.json({ material: { ...view(m), preview: m.text.slice(0, 3000) } });
});

export const deleteMaterial = asyncHandler(async (req, res) => {
  const m = isId(req.params.id) && (await Material.findOneAndDelete({ _id: req.params.id, user: req.user._id }));
  if (!m) throw new HttpError(404, 'Material not found.');
  res.json({ ok: true });
});
