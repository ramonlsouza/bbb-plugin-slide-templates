import * as React from 'react';
import { DOT_RADIUS, SlideTemplate } from './templates';

export const TILE_WIDTH = 140;

// Every thumbnail is drawn in the same frame: the page size in page units, TILE_WIDTH wide on screen.
export function ThumbnailFrame({ width, height, children }: { width: number; height: number; children?: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={TILE_WIDTH}
      height={Math.round((TILE_WIDTH * height) / width)}
      style={{ display: 'block', background: '#fff', border: '1px solid #ccc' }}
      aria-hidden="true"
      data-test="slideTemplateThumbnail"
    >
      {children}
    </svg>
  );
}

// A blank page: the frame alone.
export function BlankThumbnail({ width, height }: { width: number; height: number }) {
  return <ThumbnailFrame width={width} height={height} />;
}

// A file: a document with a folded corner and an up arrow, centered in the frame.
export function FileThumbnail({ width, height }: { width: number; height: number }) {
  const ih = height * 0.6;
  const iw = ih * 0.78;
  const x = (width - iw) / 2;
  const y = (height - ih) / 2;
  const f = iw * 0.28;
  const cx = x + iw / 2;
  const stroke = { stroke: '#666', strokeWidth: 1.5, fill: 'none', vectorEffect: 'non-scaling-stroke' as const };
  return (
    <ThumbnailFrame width={width} height={height}>
      <path d={`M${x} ${y} L${x + iw - f} ${y} L${x + iw} ${y + f} L${x + iw} ${y + ih} L${x} ${y + ih} Z`} {...stroke} />
      <path d={`M${x + iw - f} ${y} L${x + iw - f} ${y + f} L${x + iw} ${y + f}`} {...stroke} />
      <path d={`M${cx} ${y + ih * 0.78} L${cx} ${y + ih * 0.4}`} {...stroke} />
      <path d={`M${cx - iw * 0.18} ${y + ih * 0.53} L${cx} ${y + ih * 0.4} L${cx + iw * 0.18} ${y + ih * 0.53}`} {...stroke} />
    </ThumbnailFrame>
  );
}

// The thumbnail draws the same shapes as the PDF, in page units, but with strokes and dots of a fixed
// size on screen: at 140 px a page stroke of 0.75 pt would be about 0.07 px and the tile would look blank.
function Thumbnail({ template, width, height }: { template: SlideTemplate; width: number; height: number }) {
  const shapes = template.draw(width, height);
  const dotRadius = Math.max(DOT_RADIUS, (1.2 * width) / TILE_WIDTH);
  return (
    <ThumbnailFrame width={width} height={height}>
      {shapes.map((s, i) => (s.kind === 'line' ? (
        <line
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.weight === 'bold' ? '#555' : '#888'}
          strokeWidth={s.weight === 'bold' ? 1.5 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        // eslint-disable-next-line react/no-array-index-key
        <circle key={i} cx={s.cx} cy={s.cy} r={dotRadius} fill="#666" />
      )))}
    </ThumbnailFrame>
  );
}

export default Thumbnail;
