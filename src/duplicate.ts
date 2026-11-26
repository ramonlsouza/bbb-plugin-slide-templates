import { jpegPagePdfBytes } from './pdf';

// A copy of a page as a one-page PDF: the page's SVG (what the whiteboard shows, without the drawings) drawn
// on a canvas and kept as a JPEG. It is a picture of the page, so its text cannot be selected.

// The canvas is twice the SVG size, at most this wide, so the copy stays sharp without growing too big.
const MAX_WIDTH = 3840;
const JPEG_QUALITY = 0.9;

// The page URL carries its pageToken; bbb-web also wants the session of the user.
const withSessionToken = (url: string, sessionToken?: string): string => {
  if (!sessionToken) return url;
  return `${url}${url.includes('?') ? '&' : '?'}sessionToken=${encodeURIComponent(sessionToken)}`;
};

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('the page SVG could not be drawn'));
  image.src = src;
});

const jpegOf = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('the page could not be encoded'))), 'image/jpeg', JPEG_QUALITY);
});

export async function duplicatePagePdf(
  svgUrl: string,
  sessionToken: string | undefined,
  pageWidth: number,
  pageHeight: number,
): Promise<Uint8Array> {
  const response = await fetch(withSessionToken(svgUrl, sessionToken), { credentials: 'include' });
  if (!response.ok) throw new Error(`the page SVG answered ${response.status}`);
  const svg = await response.blob();
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(objectUrl);
    const naturalWidth = image.naturalWidth || pageWidth;
    const naturalHeight = image.naturalHeight || pageHeight;
    const scale = Math.min(2, MAX_WIDTH / naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(naturalWidth * scale);
    canvas.height = Math.round(naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d canvas');
    // JPEG has no transparency: a transparent area of the page stays white, as on the whiteboard.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = new Uint8Array(await (await jpegOf(canvas)).arrayBuffer());
    return jpegPagePdfBytes(pageWidth, pageHeight, jpeg, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
