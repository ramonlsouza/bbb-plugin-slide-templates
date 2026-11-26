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

// Writes a PDF from its objects, numbered from 1 in order. A part is text (ASCII only) or raw bytes, so a
// binary stream (a JPEG) can sit inside an object; the cross-reference table counts bytes.
type Part = string | Uint8Array;

const ascii = (text: string): Uint8Array => {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i);
  return bytes;
};

function writePdf(objects: Part[][]): Uint8Array {
  const chunks: Uint8Array[] = [];
  let length = 0;
  const push = (part: Part) => {
    const bytes = typeof part === 'string' ? ascii(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  push('%PDF-1.4\n');
  const offsets: number[] = [];
  objects.forEach((parts, i) => {
    offsets.push(length);
    push(`${i + 1} 0 obj\n`);
    parts.forEach(push);
    push('\nendobj\n');
  });
  const xref = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((o) => push(`${`0000000000${o}`.slice(-10)} 00000 n \n`));
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  chunks.forEach((c) => { out.set(c, at); at += c.length; });
  return out;
}

export function pdfBytes(width: number, height: number, shapes: Shape[]): Uint8Array {
  const content = contentStream(width, height, shapes);
  return writePdf([
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(width)} ${n(height)}] /Contents 4 0 R /Resources << >> >>`],
    [`<< /Length ${content.length} >>\nstream\n${content}endstream`],
  ]);
}

// A one-page PDF of width x height whose page is a JPEG image of imageWidth x imageHeight pixels, stretched over
// the whole page.
export function jpegPagePdfBytes(
  width: number,
  height: number,
  jpeg: Uint8Array,
  imageWidth: number,
  imageHeight: number,
): Uint8Array {
  const content = `q ${n(width)} 0 0 ${n(height)} 0 0 cm /Im0 Do Q\n`;
  return writePdf([
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(width)} ${n(height)}] /Contents 4 0 R `
      + '/Resources << /XObject << /Im0 5 0 R >> >> >>'],
    [`<< /Length ${content.length} >>\nstream\n${content}endstream`],
    [`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB `
      + `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream'],
  ]);
}
