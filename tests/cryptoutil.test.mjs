import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toHex, hexToBytes, hmacSha256, sha256hex, stableStringify } from '../src/cryptoutil.mjs';

test('hex round-trips', () => {
  const bytes = new Uint8Array([0, 15, 16, 255]);
  assert.equal(toHex(bytes), '000f10ff');
  assert.deepEqual([...hexToBytes('000f10ff')], [0, 15, 16, 255]);
});

test('hmac is deterministic and keyed', async () => {
  const key = hexToBytes('aabbcc');
  const a = toHex(await hmacSha256(key, 'msg'));
  const b = toHex(await hmacSha256(key, 'msg'));
  const c = toHex(await hmacSha256(hexToBytes('ffee'), 'msg'));
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('sha256hex known vector', async () => {
  assert.equal(await sha256hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('stableStringify sorts keys deterministically', () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
  assert.equal(stableStringify({ a: 2, b: 1 }), '{"a":2,"b":1}');
});
