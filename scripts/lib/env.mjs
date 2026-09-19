/* Shared environment loading for the maintenance scripts.
 *
 * Every script needs some combination of .env values and an API token, and each had
 * grown its own copy of the same parser. Worse, tokens were read only from the shell,
 * so a value had to be re-exported in every new terminal - which is exactly the step
 * that kept getting missed. Tokens are now read from .env as well.
 *
 * .env is gitignored and untracked, so a token placed there stays local.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');

function parse(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

let fileEnv = null;

/* The shell wins over .env, so a one-off override still works without editing a file. */
export async function env(name) {
  if (process.env[name]) return process.env[name];
  if (fileEnv === null) {
    try { fileEnv = parse(await readFile(join(ROOT, '.env'), 'utf8')); } catch { fileEnv = {}; }
  }
  return fileEnv[name] || '';
}

/* Resolves an API token and, when it is missing, explains where to get it and where
   to put it. Each token is for a different service, and confusing the two is easy:
   the Supabase one configures the project, the Vercel one only touches the site's
   own build variables and has no part in sending email. */
const TOKENS = {
  SUPABASE_ACCESS_TOKEN: {
    url: 'https://supabase.com/dashboard/account/tokens',
    prefix: 'sbp_',
    purpose: 'configures the Supabase project: Edge Functions, SMTP, email templates, redirect URLs'
  },
  VERCEL_TOKEN: {
    url: 'https://vercel.com/account/tokens',
    prefix: '',
    purpose: 'sets build variables on the Vercel site. It does NOT affect authentication email, which Supabase sends'
  }
};

export async function requireToken(name) {
  const value = await env(name);
  const info = TOKENS[name] || {};
  if (value) {
    if (info.prefix && !value.startsWith(info.prefix)) {
      console.error(`${name} does not look right: it should begin with "${info.prefix}".`);
      console.error(`Create one at ${info.url}`);
      process.exit(1);
    }
    return value;
  }
  console.error(`\n${name} is not set.`);
  if (info.purpose) console.error(`  What it is for: ${info.purpose}.`);
  console.error(`  Create one at:  ${info.url}`);
  console.error('  Then either add this line to .env (it is gitignored):');
  console.error(`      ${name}=${info.prefix || ''}your-token-here`);
  console.error('  or set it for this terminal only:');
  console.error(`      $env:${name} = "${info.prefix || ''}your-token-here"`);
  process.exit(1);
}
