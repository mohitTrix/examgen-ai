import { TYPE_LABELS, formatAnswer, instructions, letter, sections, totalMarks } from './format.js';

export async function downloadPdf(paper, withKey) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const width = 210 - margin * 2;
  let y = margin;
  const write = (text, { size = 11, style = 'normal', indent = 0, gap = 2, center = false } = {}) => {
    doc.setFont('times', style).setFontSize(size);
    for (const line of doc.splitTextToSize(String(text), width - indent)) {
      if (y > 297 - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, center ? 105 : margin + indent, y, center ? { align: 'center' } : undefined);
      y += size * 0.45;
    }
    y += gap;
  };
  write(paper.title, { size: 16, style: 'bold', center: true });
  write(`${paper.subject}  |  Time: ${paper.duration} minutes  |  Maximum marks: ${totalMarks(paper.questions)}`, { center: true });
  if (paper.mode === 'demo') write('DEMO MODE: sample questions, not generated from study material.', { style: 'bold', center: true });
  instructions(paper).forEach((t) => write(`• ${t}`, { size: 10, gap: 0.5 }));
  const parts = sections(paper.questions);
  for (const s of parts) {
    y += 3;
    write(`${s.name}: ${TYPE_LABELS[s.type]}`, { size: 12, style: 'bold' });
    for (const { q, number } of s.items) {
      write(`Q${number}. ${q.text}  [${q.marks} marks${q.negativeMarks ? `, -${q.negativeMarks}` : ''}]`, { gap: 1 });
      q.options?.forEach((o, i) => write(`(${letter(i)}) ${o}`, { indent: 8, gap: 0.5 }));
      y += 2;
    }
  }
  if (withKey) {
    doc.addPage();
    y = margin;
    write('Answer Key and Explanations', { size: 14, style: 'bold' });
    parts.flatMap((s) => s.items).forEach(({ q, number }) => {
      write(`Q${number}. ${formatAnswer(q, q.correctAnswer)}`, { style: 'bold', gap: 0.5 });
      write(q.explanation, { indent: 6 });
    });
  }
  doc.save(`${paper.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'question-paper'}.pdf`);
}
