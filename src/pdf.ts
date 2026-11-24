import { DOT_RADIUS, Shape } from './templates';

// A one-page vector PDF, laid out like the blank page the server makes (BlankPagePdf.java):
// a white page, then the shapes of the template. PDF y grows upwards, the shapes' y downwards.
const n = (v: number) => (Math.round(v * 100) / 100).toString();

const STROKE: Record<'normal' | 'bold', string> = {
  normal: '0.75 w 0.7 G',
  bold: '1.25 w 0.55 G',
};

export function contentStream(width: number, height: number, shapes: Shape[]): string {
  const y = (v: number) => n(height - v);
  const out = [`1 g 0 0 ${n(width)} ${n(height)} re f`];
  (['normal', 'bold'] as const).forEach((weight) => {
    const lines = shapes.filter((s) => s.kind === 'line' && s.weight === weight);
    if (!lines.length) return;
    out.push(STROKE[weight]);
    lines.forEach((s) => {
      if (s.kind === 'line') out.push(`${n(s.x1)} ${y(s.y1)} m ${n(s.x2)} ${y(s.y2)} l S`);
    });
  });
  // A dot is a small filled square: a stroke of zero length draws nothing with the default butt cap.
  const dots = shapes.filter((s) => s.kind === 'dot');
  if (dots.length) {
    out.push('0.6 g');
    const d = n(DOT_RADIUS * 2);
    dots.forEach((s) => {
      if (s.kind === 'dot') out.push(`${n(s.cx - DOT_RADIUS)} ${y(s.cy + DOT_RADIUS)} ${d} ${d} re f`);
    });
  }
  return `${out.join('\n')}\n`;
}

export function pdfBytes(width: number, height: number, shapes: Shape[]): Uint8Array {
  const content = contentStream(width, height, shapes);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(width)} ${n(height)}] /Contents 4 0 R /Resources << >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { pdf += `${`0000000000${o}`.slice(-10)} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Only ASCII above, so one char is one byte.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i);
  return bytes;
}
