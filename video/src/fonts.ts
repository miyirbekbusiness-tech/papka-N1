// Fonts are the Google Fonts files (Montserrat, Inter) stored locally so renders work offline.
import {continueRender, delayRender, staticFile} from 'remotion';
const faces: [string, string, string][] = [
  ['Montserrat', 'montserrat-latin.woff2', '800 900'],
  ['Montserrat', 'montserrat-latin-ext.woff2', '800 900'],
  ['Inter', 'inter-latin.woff2', '700'],
  ['Inter', 'inter-latin-ext.woff2', '700'],
];
let loaded = false;
export const ensureFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const h = delayRender('fonts');
  Promise.all(
    faces.map(([fam, file, w]) => {
      const ff = new FontFace(fam, `url(${staticFile('fonts/' + file)}) format('woff2')`, {weight: w});
      return ff.load().then((f) => (document as any).fonts.add(f));
    })
  ).then(() => continueRender(h));
};
export const MONT = 'Montserrat, sans-serif';
export const INTER = 'Inter, sans-serif';
