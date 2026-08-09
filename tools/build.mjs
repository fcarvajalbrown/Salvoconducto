import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const ORDER = [
  'src/cryptoutil.mjs',
  'src/passport.mjs',
  'src/token.mjs',
  'src/introspect.mjs',
  'src/broker.mjs',
  'src/receipts.mjs',
  'src/scenario.mjs',
  'src/strings/en.mjs',
  'src/strings/es.mjs',
  'src/i18n.mjs',
  'src/ui.mjs',
  'src/app.mjs',
];

function strip(code) {
  return code
    .split('\n')
    .filter((l) => !/^\s*import\s.+from\s+['"].+['"];?\s*$/.test(l))
    .map((l) => l.replace(/^\s*export\s+(const|function|class|async\s+function)\s/, '$1 ').replace(/^\s*export\s+\{[^}]*\};?\s*$/, ''))
    .join('\n');
}

const js = ORDER.map((p) => strip(read(p))).join('\n\n');
const css = read('src/styles.css');

const body = `<style>\n${css}\n</style>\n<div id="app"></div>\n<script>\n(async () => {\n${js}\n})();\n</script>\n`;

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Salvoconducto — a citizen's pass for AI agents</title>
<meta name="description" content="Give an AI agent the fewest fields it needs, for one purpose and a set time, with an honest account of what it already saw." />
</head>
<body>
${body}</body>
</html>
`;

mkdirSync(new URL('dist/', ROOT), { recursive: true });
writeFileSync(new URL('index.html', ROOT), standalone);
writeFileSync(new URL('dist/artifact.html', ROOT), body);

if (/\b(src=|href=|https?:\/\/)/.test(body.replace(/https?:\/\/[^\s'"]*w3\.org/g, ''))) {
  console.error('External reference detected in artifact');
  process.exit(1);
}
console.log('Built index.html —', standalone.length, 'bytes (served by GitHub Pages)');
console.log('Built dist/artifact.html —', body.length, 'bytes (body-only)');
