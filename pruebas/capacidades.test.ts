// Correr: npm run test:fork
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { comoMedio, esVideo } from '@api/extensions/capacidades/capacidades.puro';

test('un medio por URL va tal cual; en base64 se vuelve Buffer (con o sin el prefijo data:)', () => {
  assert.deepEqual(comoMedio({ url: 'https://x/y.jpg' }), { url: 'https://x/y.jpg' });
  const b = comoMedio({ base64: 'data:image/png;base64,aGVsbG8=' });
  assert.ok(Buffer.isBuffer(b));
  assert.equal((b as Buffer).toString(), 'hello');
  assert.equal((comoMedio({ base64: 'aGVsbG8=' }) as Buffer).toString(), 'hello');
});

test('video por mimetype o por extensión; si no, imagen', () => {
  assert.equal(esVideo({ url: 'https://x/clip.mp4' }), true);
  assert.equal(esVideo({ url: 'https://x/clip.mp4?token=1' }), true);
  assert.equal(esVideo({ url: 'https://x/foto.jpg' }), false);
  assert.equal(esVideo({ url: 'https://x/foto.jpg', mimetype: 'video/mp4' }), true);
  assert.equal(esVideo({ base64: 'aGVsbG8=' }), false);
});
