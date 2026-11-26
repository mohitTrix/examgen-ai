// Editable starting points, NOT official specifications. Real exam patterns change
// between sessions and papers, so users should check the current official notice.
export const EXAM_PATTERNS = {
  GATE: { questionTypes: ['mcq', 'msq', 'numerical'], questionCount: 15, duration: 45, marksPerQuestion: 2, negativeMarks: 0.67, negativeTypes: ['mcq'],
    style: 'Technical, concept-and-application questions. Prefer problems needing reasoning or calculation over recall.' },
  JEE: { questionTypes: ['mcq', 'numerical'], questionCount: 15, duration: 45, marksPerQuestion: 4, negativeMarks: 1, negativeTypes: ['mcq', 'numerical'],
    style: 'Multi-step problem solving with four-option MCQs and numerical-value questions.' },
  NEET: { questionTypes: ['mcq'], questionCount: 20, duration: 20, marksPerQuestion: 4, negativeMarks: 1, negativeTypes: ['mcq'],
    style: 'Concise single-correct four-option MCQs, including statement-based and assertion-reason styles.' },
  UPSC: { questionTypes: ['mcq'], questionCount: 20, duration: 24, marksPerQuestion: 2, negativeMarks: 0.66, negativeTypes: ['mcq'],
    style: 'Preliminary-style four-option MCQs, often "consider the following statements, which are correct?".' },
  University: { questionTypes: ['mcq', 'truefalse', 'short'], questionCount: 10, duration: 60, marksPerQuestion: 5, negativeMarks: 0, negativeTypes: [],
    style: 'University semester style: definitions, explanations, comparisons and applied short answers.' },
  Custom: { questionTypes: ['mcq'], questionCount: 10, duration: 20, marksPerQuestion: 1, negativeMarks: 0, negativeTypes: [],
    style: 'Clear, well-balanced exam questions.' },
};
