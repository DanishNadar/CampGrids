/* Renders the composable email sources in supabase/email/ into the flat HTML files
 * Supabase actually stores, plus a plain-text alternative for each.
 *
 *   node scripts/buildEmails.mjs
 *   node scripts/buildEmails.mjs --check      # fail if the output is stale
 *
 * The built files are committed so the templates can be reviewed as plain HTML and
 * pushed without a build step. --check is what keeps them honest: it rebuilds in
 * memory and exits non-zero if anything differs from what is on disk, so a change
 * to a component cannot be forgotten before pushing.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { templates } from '../supabase/email/templates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'supabase', 'email-templates');
const check = process.argv.includes('--check');

const BANNER = (t) => `<!-- Built by scripts/buildEmails.mjs from supabase/email/. Do not edit by hand.
     Source: supabase/email/templates.mjs -> ${t.id}
     Supabase template: ${t.supabaseTemplate}  (${t.configKeys.content})
     Subject: ${t.subject} -->
`;

let stale = 0;

await mkdir(OUT, { recursive: true });

for (const template of templates) {
  const html = BANNER(template) + template.html();
  const text = template.text();

  for (const [file, content] of [[`${template.id}.html`, html], [`${template.id}.txt`, text]]) {
    const path = join(OUT, file);
    let existing = null;
    try { existing = await readFile(path, 'utf8'); } catch { /* new file */ }

    if (existing === content) {
      console.log(`  unchanged  ${file}`);
      continue;
    }
    if (check) {
      console.error(`  STALE      ${file}${existing === null ? ' (missing)' : ''}`);
      stale += 1;
      continue;
    }
    await writeFile(path, content, 'utf8');
    console.log(`  written    ${file}  (${content.length} bytes)`);
  }
}

if (check && stale) {
  console.error(`\n${stale} built file(s) do not match supabase/email/. Run: node scripts/buildEmails.mjs`);
  process.exit(1);
}
console.log(check ? '\nBuilt output is up to date.' : '\nDone. Push with scripts/pushEmailTemplates.mjs');
