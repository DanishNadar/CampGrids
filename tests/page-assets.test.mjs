/* The tab emblem.
 *
 *   node --test tests/page-assets.test.mjs
 *
 * A missing or mistyped icon path does not fail anything: the browser quietly
 * shows its own default, which looks like nothing was ever done. These tests check
 * every page declares the emblem, that the files it points at exist, and that the
 * relative paths are right for each page's depth - admin/index.html has to climb a
 * level, and that is the one most likely to be wrong.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets', 'supabase', 'tests', 'scripts', 'aws', '.vercel']);

async function htmlPages(dir = ROOT, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await htmlPages(join(dir, entry.name), found);
    } else if (entry.name.endsWith('.html')) {
      found.push(join(dir, entry.name));
    }
  }
  return found;
}

const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };

let pages = [];
before(async () => { pages = await htmlPages(); });

describe('the tab emblem', () => {
  test('the generated files are all present', async () => {
    for (const file of ['favicon-16.png', 'favicon-32.png', 'favicon-48.png',
                        'favicon-180.png', 'favicon-192.png', 'favicon-512.png', 'favicon.svg']) {
      assert.ok(await exists(join(ROOT, 'assets', 'icons', file)), `assets/icons/${file} is missing`);
    }
    assert.ok(await exists(join(ROOT, 'site.webmanifest')), 'site.webmanifest is missing');
  });

  test('every page declares it', async () => {
    assert.ok(pages.length >= 10, `expected the site's pages, found ${pages.length}`);
    const missing = [];
    for (const page of pages) {
      const html = await readFile(page, 'utf8');
      if (!/<link[^>]+rel="icon"/.test(html)) missing.push(relative(ROOT, page));
    }
    assert.deepEqual(missing, [], `these pages have no tab emblem: ${missing.join(', ')}`);
  });

  test('every declared path resolves from the page that declares it', async () => {
    const broken = [];
    for (const page of pages) {
      const html = await readFile(page, 'utf8');
      const hrefs = [...html.matchAll(/<link[^>]+(?:rel="(?:icon|apple-touch-icon|manifest)")[^>]*>/g)]
        .map((tag) => (tag[0].match(/href="([^"]+)"/) || [])[1])
        .filter(Boolean);

      for (const href of hrefs) {
        // Resolved the way a browser would: relative to the page's own directory.
        const target = join(dirname(page), href);
        if (!(await exists(target))) broken.push(`${relative(ROOT, page)} -> ${href}`);
      }
    }
    assert.deepEqual(broken, [], `broken icon references:\n  ${broken.join('\n  ')}`);
  });

  test('a page in a subdirectory climbs to reach the assets', async () => {
    /* The failure this catches: copying the root page's markup into admin/, where
       "assets/icons/..." silently points at a directory that does not exist. */
    const nested = pages.filter((p) => relative(ROOT, p).includes('\\') || relative(ROOT, p).includes('/'));
    assert.ok(nested.length > 0, 'expected at least one page in a subdirectory');
    for (const page of nested) {
      const html = await readFile(page, 'utf8');
      const depth = relative(ROOT, page).split(/[\\/]/).length - 1;
      const href = (html.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/) || [])[1];
      assert.ok(href, `${relative(ROOT, page)} declares no icon href`);
      assert.match(href, new RegExp(`^(\\.\\./){${depth}}assets/`),
        `${relative(ROOT, page)} is ${depth} level(s) deep, so its icon path must climb ${depth} time(s); got "${href}"`);
    }
  });

  test('the brand colour is declared once per page and matches the emblem', async () => {
    for (const page of pages) {
      const html = await readFile(page, 'utf8');
      const themes = [...html.matchAll(/<meta name="theme-color" content="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(themes.length, 1, `${relative(ROOT, page)} declares ${themes.length} theme colours`);
      assert.equal(themes[0], '#FE5000', `${relative(ROOT, page)} uses ${themes[0]} rather than the brand orange`);
    }
  });

  test('the manifest points at files that exist', async () => {
    const manifest = JSON.parse(await readFile(join(ROOT, 'site.webmanifest'), 'utf8'));
    assert.equal(manifest.theme_color, '#FE5000');
    assert.ok(manifest.icons.length >= 2);
    for (const icon of manifest.icons) {
      assert.ok(await exists(join(ROOT, icon.src)), `the manifest references a missing file: ${icon.src}`);
    }
  });

  test('the emblem carries its own ground', async () => {
    /* The source mark is white on transparent. Used bare it disappears against a
       light tab strip, which is why it sits on the brand orange. */
    const svg = await readFile(join(ROOT, 'assets', 'icons', 'favicon.svg'), 'utf8');
    assert.match(svg, /<rect[^>]+fill="#FE5000"/, 'the emblem must paint a ground behind the white mark');
    assert.match(svg, /data:image\/png;base64,/, 'the mark must be embedded so the file works wherever it is served');
  });
});
