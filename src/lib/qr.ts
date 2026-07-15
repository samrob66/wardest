import { renderSVG } from 'uqr';

// Returns a self-contained, vector SVG string (viewBox, no fixed width/height) that scales
// to its container — stays crisp at any print/poster size. No external requests.
export function qrSvg(text: string): string {
  return renderSVG(text, { border: 2 });
}
