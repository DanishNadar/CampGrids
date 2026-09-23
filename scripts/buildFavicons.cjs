/* Builds the tab emblem from assets/MSI_Logo.png.
 *
 * The mark is white on transparent, so it needs a ground or it disappears on a
 * light tab strip. It sits on the brand orange, which is the same treatment the
 * staff emails use, so the two read as one system.
 *
 * The geometry is taken from MSI_Icon.png, the supplied artwork: square corners
 * and the mark at 65% of the tile height. That file is 200px, so it is used as the
 * reference rather than the source - everything here is rendered from the 524x601
 * logo instead, and nothing is upscaled.
 *
 * Each size is rendered at its own resolution rather than downscaled from one
 * large image: at 16px the isometric strokes are a pixel wide, and resampling
 * turns them to mush.
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/Danis/Documents/Development/CampGrids';
const SRC = path.join(ROOT, 'assets', 'MSI_Logo.png');
const OUT = path.join(ROOT, 'assets', 'icons');
const ORANGE = '#FE5000';
const MARK = 0.65;      // mark height as a share of the tile, per MSI_Icon.png
const RADIUS = 0;       // square, per MSI_Icon.png; Apple rounds its own

const SIZES = [
  ['favicon-16.png', 16],
  ['favicon-32.png', 32],
  ['favicon-48.png', 48],
  ['favicon-180.png', 180],   // apple-touch-icon
  ['favicon-192.png', 192],   // Android / PWA
  ['favicon-512.png', 512]    // PWA and link previews
];

function tile(size) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${size}px;height:${size}px;background:transparent}
    .t{width:${size}px;height:${size}px;background:${ORANGE};
       border-radius:${Math.round(size * RADIUS)}px;display:grid;place-items:center;overflow:hidden}
    img{width:${MARK * 100}%;height:${MARK * 100}%;object-fit:contain}
  </style></head><body><div class="t"><img src="file:///${SRC.split(path.sep).join('/')}"></div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });

  for (const [name, size] of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const tmp = path.join(__dirname, `tile-${size}.html`);
    fs.writeFileSync(tmp, tile(size));
    await page.goto('file:///' + tmp.split(path.sep).join('/'));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, name), omitBackground: true });
    await page.close();
    console.log(`  ${name.padEnd(18)} ${size}x${size}`);
  }
  await browser.close();

  /* A scalable version for browsers that prefer it, so the emblem stays crisp on
     high-density displays and in large bookmark views. The mark is embedded rather
     than referenced, so the file works wherever it is served from. */
  const base64 = fs.readFileSync(SRC).toString('base64');
  const inset = ((1 - MARK) / 2 * 512).toFixed(1);
  const span = (MARK * 512).toFixed(1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="MSI CampGrids">
  <rect width="512" height="512" rx="${Math.round(512 * RADIUS)}" fill="${ORANGE}"/>
  <image x="${inset}" y="${inset}" width="${span}" height="${span}"
         preserveAspectRatio="xMidYMid meet"
         href="data:image/png;base64,${base64}"/>
</svg>
`;
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg);
  console.log(`  favicon.svg        scalable (${Math.round(svg.length / 1024)} KB)`);

  /* A web app manifest, so an installed shortcut uses the emblem too. */
  const manifest = {
    name: 'CampGrids',
    short_name: 'CampGrids',
    description: 'MSI Camp Grids',
    start_url: '/',
    display: 'standalone',
    background_color: '#f1f5f9',
    theme_color: ORANGE,
    icons: [
      { src: 'assets/icons/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/icons/favicon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'assets/icons/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  };
  fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('  site.webmanifest');
})();
