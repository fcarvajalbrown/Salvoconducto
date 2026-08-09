import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EN } from '../src/strings/en.mjs';
import { ES } from '../src/strings/es.mjs';
import { createI18n } from '../src/i18n.mjs';

test('EN and ES have identical key sets', () => {
  const ek = Object.keys(EN).sort();
  const sk = Object.keys(ES).sort();
  assert.deepEqual(ek, sk);
});

test('no empty translations', () => {
  for (const [k, v] of Object.entries(ES)) assert.ok(v.trim().length > 0, `empty ES: ${k}`);
});

test('i18n substitutes vars and switches language', () => {
  const i = createI18n('en');
  assert.equal(i.t('minimization', { n: 3, total: 20 }), EN.minimization.replace('{n}', '3').replace('{total}', '20'));
  i.setLang('es');
  assert.equal(i.lang, 'es');
});
