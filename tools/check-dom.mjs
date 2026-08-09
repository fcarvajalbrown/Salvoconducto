import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../src/ui.mjs', import.meta.url), 'utf8');
const querySelectorIds = [...ui.matchAll(/querySelector\('#([\w-]+)'\)/g)].map((m) => m[1]);
const createdIds = new Set([...ui.matchAll(/id:\s*'([\w-]+)'/g)].map((m) => m[1]));
createdIds.add('app');

const dynamicPrefixes = ['pf-', 'cb-'];
const missing = querySelectorIds.filter((id) => !createdIds.has(id) && !dynamicPrefixes.some((p) => id.startsWith(p)));
if (missing.length) {
  console.error('Missing ids referenced by querySelector:', missing);
  process.exit(1);
}
console.log('DOM id contract OK:', querySelectorIds.length, 'lookups checked');
