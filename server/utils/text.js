const STOP = new Set('a an the of in on to is are was were be been and or for with which what who how why when where that this these those following statement statements true false correct incorrect about from by as at it its does do'.split(' '));

export const normalise = (s) =>
  String(s || '')
    .normalize('NFKC')
    .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2') // re-join words hyphenated across PDF lines
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

export const tokens = (s) => normalise(s).split(' ').filter((t) => t && !STOP.has(t));

export function similarity(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return normalise(a) === normalise(b) ? 1 : 0;
  let shared = 0;
  A.forEach((t) => B.has(t) && shared++);
  return shared / (A.size + B.size - shared);
}

export function isDuplicate(question, others) {
  return others.some((o) => {
    if (normalise(o.text) === normalise(question.text)) return true;
    // Numbers often distinguish otherwise identical questions
    const nums = (s) => (s.match(/-?\d+(\.\d+)?/g) || []).join(',');
    return nums(o.text) === nums(question.text) && similarity(o.text, question.text) >= 0.8;
  });
}

// The grounding check: the model's supporting quote must really occur in the material.
export function quoteInSource(quote, normalisedSource) {
  const q = normalise(quote);
  return q.length >= 20 && ` ${normalisedSource} `.includes(` ${q} `);
}

export function chunk(text, size = 1800) {
  const parts = String(text).split(/\n\s*\n/);
  const chunks = [];
  let current = '';
  for (let part of parts) {
    while (part.length > size) {
      let cut = part.lastIndexOf(' ', size);
      if (cut < size / 2) cut = size;
      if (current) chunks.push(current), (current = '');
      chunks.push(part.slice(0, cut));
      part = part.slice(cut).trim();
    }
    if (current && current.length + part.length > size) chunks.push(current), (current = '');
    current += (current ? '\n\n' : '') + part;
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

// Keyword retrieval. Returns the excerpt for one generation round; rotating `round`
// moves through long documents so later batches see different material.
export function selectContext(materialText, query, budget = 40000, round = 0) {
  const chunks = chunk(materialText);
  const terms = new Set(tokens(query));
  const scored = chunks.map((c, index) => {
    const words = new Set(tokens(c));
    let score = 0;
    terms.forEach((t) => words.has(t) && score++);
    return { c, index, score };
  });
  const matched = scored.filter((s) => s.score > 0);
  if (materialText.length <= budget) return { context: materialText, matched: matched.length };
  const ranked = (matched.length ? matched : scored).sort((a, b) => b.score - a.score || a.index - b.index);
  const start = (round * Math.max(1, Math.floor(budget / 1800 / 2))) % ranked.length;
  const picked = [];
  let used = 0;
  for (let i = 0; i < ranked.length; i++) {
    const item = ranked[(start + i) % ranked.length];
    if (used + item.c.length > budget) continue;
    picked.push(item);
    used += item.c.length;
  }
  return {
    context: picked.sort((a, b) => a.index - b.index).map((p) => p.c).join('\n\n'),
    matched: matched.length,
  };
}
