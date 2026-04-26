/**
 * Generates mobile/src/components/game/utils/cardSvgs.js from @letele/playing-cards.
 *
 * Run from repo root:
 *   node mobile/scripts/genCardSvgs.mjs
 *
 * Prerequisites (run once from client/):
 *   cd client && npm install
 *
 * The script renders every card component to a static SVG string via React's
 * server renderer, applies a react-native-svg compatibility fix, and writes the
 * result to cardSvgs.js.
 *
 * Fix applied:
 *   react-native-svg intermittently ignores x/y attributes on <use> elements
 *   that reference <symbol> elements with a viewBox, causing pip icons to render
 *   at (0,0) (card centre) instead of their correct position.
 *   We wrap every <use x=... y=...> in <g transform="translate(x,y)"> and
 *   upgrade xlink:href → href throughout.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../src/components/game/utils/cardSvgs.js');

// All three imports must come from the same React instance (the client's) so that
// elements created by @letele/playing-cards and the renderer share the same React.
const clientModules = path.join(__dirname, '../../client/node_modules');
const { createElement } = await import(pathToFileURL(path.join(clientModules, 'react/index.js')).href);
const { renderToStaticMarkup } = await import(pathToFileURL(path.join(clientModules, 'react-dom/server.js')).href);

// Load from the web client's node_modules (the package lives there, ESM-only)
const deckPath = path.join(clientModules, '@letele/playing-cards/dist/index.esm.js');
const deck = await import(pathToFileURL(deckPath).href);

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'];

/**
 * Fix SVG string for react-native-svg compatibility:
 * 1. Wrap <use x=... y=...> in <g transform="translate(x,y)">
 * 2. Move transform attribute from <use> to a wrapping <g> (react-native-svg
 *    ignores transform on <use> just like x/y — affects face card mirror halves)
 * 3. Upgrade xlink:href → href
 */
function fixSvg(svg) {
  return svg.replace(/<use\b([^>]*)><\/use>/g, (full, attrs) => {
    const xM = attrs.match(/\s+x="([^"]*)"/);
    const yM = attrs.match(/\s+y="([^"]*)"/);
    const tM = attrs.match(/\s+transform="([^"]*)"/);

    // Upgrade xlink:href → href in all cases
    let cleanAttrs = attrs.replace(/xlink:href/g, 'href');

    if (!xM && !yM && !tM) {
      return `<use${cleanAttrs}></use>`;
    }

    const x = xM ? xM[1] : '0';
    const y = yM ? yM[1] : '0';

    if (xM) cleanAttrs = cleanAttrs.replace(xM[0], '');
    if (yM) cleanAttrs = cleanAttrs.replace(yM[0], '');
    if (tM) cleanAttrs = cleanAttrs.replace(tM[0], '');
    cleanAttrs = cleanAttrs.replace(/  +/g, ' ');

    // Build nested wrappers: translate outermost, then original transform
    const inner = tM ? `<g transform="${tM[1]}"><use${cleanAttrs}></use></g>` : `<use${cleanAttrs}></use>`;
    if (xM || yM) {
      return `<g transform="translate(${x},${y})">${inner}</g>`;
    }
    return inner;
  });
}

const entries = [];

// Card back
if (deck.B1) {
  const svg = fixSvg(renderToStaticMarkup(createElement(deck.B1)));
  entries.push(`  "B1": ${JSON.stringify(svg)}`);
}

// All 52 cards
for (const suit of SUITS) {
  for (const rank of RANKS) {
    const key = suit + rank;
    if (!deck[key]) {
      console.warn(`Missing: ${key}`);
      continue;
    }
    const svg = fixSvg(renderToStaticMarkup(createElement(deck[key])));
    entries.push(`  ${JSON.stringify(key)}: ${JSON.stringify(svg)}`);
  }
}

const banner = [
  '// Auto-generated card SVGs from @letele/playing-cards. Do not edit manually.',
  '// Regenerate: node mobile/scripts/genCardSvgs.mjs  (run from repo root)',
  '//',
  '// Fix applied: <use x=... y=...> wrapped in <g transform="translate(x,y)"> to',
  '// work around react-native-svg intermittently dropping x/y positional attrs on',
  '// <use> elements that reference <symbol> elements with a viewBox. All',
  '// xlink:href attrs upgraded to href (SVG 2.0). See: scripts/genCardSvgs.mjs.',
].join('\n');

const output = `${banner}\nconst CARD_SVGS = {\n${entries.join(',\n')},\n};\nexport default CARD_SVGS;\n`;
writeFileSync(OUT_PATH, output, 'utf8');
console.log(`Written ${entries.length} cards to ${OUT_PATH}`);
