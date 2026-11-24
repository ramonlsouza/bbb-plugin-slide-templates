// Templates are described once, in page units with the origin at the top left, and drawn twice:
// into the PDF that is inserted (pdf.ts) and into the thumbnail of the panel (thumbnail.tsx).

export type Shape =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; weight: 'normal' | 'bold' }
  | { kind: 'dot'; cx: number; cy: number };

export interface SlideTemplate {
  id: string;
  label: string;
  draw: (width: number, height: number) => Shape[];
}

// The radius of a dot on the page, in page units.
export const DOT_RADIUS = 1.5;

const line = (x1: number, y1: number, x2: number, y2: number, weight: 'normal' | 'bold' = 'normal'): Shape => ({
  kind: 'line', x1, y1, x2, y2, weight,
});

// Steps from start to end (inclusive when it falls on the end), at most 1000 of them.
const steps = (start: number, end: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = start; v <= end + 1e-6 && out.length < 1000; v += step) out.push(v);
  return out;
};

// Spacing of the patterns follows the height, so a template looks alike on any page size.
const unit = (height: number) => height / 18;

const lined = (w: number, h: number): Shape[] => {
  const s = unit(h);
  const left = w * 0.06;
  const right = w * 0.94;
  const shapes = steps(s * 2, h - s, s).map((y) => line(left, y, right, y));
  const margin = w * 0.12;
  shapes.push(line(margin, s, margin, h - s * 0.5, 'bold'));
  return shapes;
};

const grid = (w: number, h: number): Shape[] => {
  const s = unit(h);
  return [
    ...steps(0, w, s).map((x) => line(x, 0, x, h)),
    ...steps(0, h, s).map((y) => line(0, y, w, y)),
  ];
};

const dots = (w: number, h: number): Shape[] => {
  const s = unit(h);
  const shapes: Shape[] = [];
  steps(s, h - s * 0.5, s).forEach((cy) => steps(s, w - s * 0.5, s).forEach((cx) => shapes.push({ kind: 'dot', cx, cy })));
  return shapes;
};

const graph = (w: number, h: number): Shape[] => {
  const s = h / 45;
  const xs = steps(0, w, s);
  const ys = steps(0, h, s);
  return [
    ...xs.map((x, i) => line(x, 0, x, h, i % 5 === 0 ? 'bold' : 'normal')),
    ...ys.map((y, i) => line(0, y, w, y, i % 5 === 0 ? 'bold' : 'normal')),
  ];
};

export const TEMPLATES: SlideTemplate[] = [
  { id: 'lined', label: 'Lined', draw: lined },
  { id: 'grid', label: 'Grid', draw: grid },
  { id: 'dots', label: 'Dots', draw: dots },
  { id: 'graph', label: 'Graph paper', draw: graph },
];
