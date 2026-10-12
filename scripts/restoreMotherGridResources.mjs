/* Restores the canonical instruction and video URLs after a legacy Grid import
 * created project rows with names but blank link fields.
 *
 *   node scripts/restoreMotherGridResources.mjs --dry-run
 *   node scripts/restoreMotherGridResources.mjs --apply
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env, ROOT } from './lib/env.mjs';

const belts = new Map([
  ['white', 'WT'], ['yellow', 'YW'], ['orange', 'OR'], ['green', 'GN'],
  ['blue', 'BU'], ['purple', 'PL'], ['brown', 'BN'], ['black', 'BK']
]);

function csvRows(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(value); value = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && text[index + 1] === '\n') index += 1; row.push(value); rows.push(row); row = []; value = ''; }
    else value += character;
  }
  row.push(value); rows.push(row);
  return rows.filter((entry) => entry.some((cell) => cell.trim()));
}

function gridEntry(raw) {
  const parts = String(raw || '').split('|');
  const text = parts[0].trim();
  if (!text) return null;
  const match = text.match(/^(.*?)\s*:\s*(instructions?|videos?)$/i);
  const name = (match ? match[1] : text).trim();
  if (!name) return null;
  const url = parts.slice(1).join('|').trim();
  return { name, kind: match ? (/^instruction/i.test(match[2]) ? 'instructions' : 'video') : 'activity', url };
}

function canonicalCells(text) {
  const rows = csvRows(text);
  const categories = rows.shift()?.slice(1).map((entry) => entry.trim()) || [];
  const cells = new Map(); let belt = '';
  for (const row of rows) {
    const label = String(row[0] || '').trim().toLowerCase();
    if (label && belts.has(label)) belt = belts.get(label);
    if (!belt) continue;
    categories.forEach((category, index) => {
      if (!category) return;
      const entry = gridEntry(row[index + 1]);
      if (!entry) return;
      const key = `${belt}-${index + 1}`;
      if (!cells.has(key)) cells.set(key, { belt_code: belt, column_number: index + 1, projects: new Map() });
      const cell = cells.get(key);
      if (!cell.projects.has(entry.name)) cell.projects.set(entry.name, { name: entry.name, instructions_url: '', video_url: '' });
      const project = cell.projects.get(entry.name);
      if (entry.kind === 'video') project.video_url ||= entry.url;
      else project.instructions_url ||= entry.url;
    });
  }
  return [...cells.values()].map((cell) => {
    const projects = [...cell.projects.values()];
    return { ...cell, projects, resource_url: projects[0]?.instructions_url || projects[0]?.video_url || null };
  });
}

async function api(url, key, path, init = {}) {
  const response = await fetch(`${url.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry-run');
  if (apply === dryRun) throw new Error('Pass exactly one of --dry-run or --apply.');

  const file = join(ROOT, 'assets', 'mother-grid-template.csv');
  const cells = canonicalCells(await readFile(file, 'utf8'));
  const projects = cells.flatMap((cell) => cell.projects);
  const linked = projects.filter((project) => project.instructions_url || project.video_url).length;
  if (!cells.length || !linked) throw new Error('The canonical Mother Grid CSV contains no linked activities.');
  console.log(`Canonical Grid: ${cells.length} cells, ${projects.length} projects, ${linked} projects with a resource link.`);
  if (dryRun) { console.log('Dry run. No live Mother Grid records changed.'); return; }

  const url = await env('SUPABASE_URL');
  const key = await env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.');
  let changed = 0;
  const queue = [...cells];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const cell = queue.shift();
      const filter = new URLSearchParams({ belt_code: `eq.${cell.belt_code}`, column_number: `eq.${cell.column_number}` });
      await api(url, key, `/rest/v1/mother_grid_cells?${filter}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ projects: cell.projects, resource_url: cell.resource_url }),
      });
      changed += 1;
    }
  });
  await Promise.all(workers);
  console.log(`Restored resource links for ${changed} Mother Grid cells.`);
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
