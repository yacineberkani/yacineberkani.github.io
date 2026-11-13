import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractImages, updateIndexMeta, publish } from '../admin/js/publish.js';
import { detectImageType, slugify } from '../admin/js/images.js';

const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const WEBP = 'data:image/webp;base64,UklGRhYAAABXRUJQVlA4IAoAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==';

test('detectImageType reconnaît JPEG/PNG/WebP et refuse le reste', () => {
  assert.equal(detectImageType(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])), 'jpeg');
  assert.equal(detectImageType(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])), 'png');
  assert.equal(detectImageType(Uint8Array.from(atob(WEBP.split(',')[1]), c => c.charCodeAt(0))), 'webp');
  assert.equal(detectImageType(new TextEncoder().encode('<svg onload=alert(1)>')), null);
  assert.equal(detectImageType(new Uint8Array([])), null);
});

test('slugify', () => {
  assert.equal(slugify('Détection de Tumeurs !'), 'detection-de-tumeurs');
  assert.equal(slugify(''), 'image');
});

test('extractImages transforme les data URL en fichiers, sans modifier le brouillon', async () => {
  const draft = structuredClone(content);
  draft.profile.photo.src = WEBP;
  draft.projects.items[0].image = WEBP;
  const { content: out, images } = await extractImages(draft);
  assert.match(out.profile.photo.src, /^assets\/images\/profile\/yacine-berkani-[0-9a-f]{8}\.webp$/);
  assert.match(out.projects.items[0].image, /^assets\/images\/projects\/agent-finops-gcp-[0-9a-f]{8}\.webp$/);
  assert.equal(images.length, 2);
  assert.equal(draft.profile.photo.src, WEBP);
});

test('updateIndexMeta met à jour le titre et la description en les échappant', () => {
  const html = updateIndexMeta(indexHtml, { siteTitle: 'A <b> & B', description: 'Desc "x"' });
  assert.match(html, /<title>A &lt;b&gt; &amp; B<\/title>/);
  assert.match(html, /<meta name="description" content="Desc &quot;x&quot;">/);
  assert.equal(updateIndexMeta(indexHtml, content.meta), indexHtml);
});

test('publish : un seul commit avec content.json + image, suppression des seules images inutilisées', async () => {
  const calls = [];
  const gh = {
    readText: async () => indexHtml,
    commitChanges: async (args) => { calls.push(args); return 'newsha'; }
  };
  const draft = structuredClone(content);
  draft.projects.items[1].image = WEBP;
  const res = await publish({ gh, draft, baseSha: 'base', pendingDeletes: ['assets/images/old.webp', 'assets/images/Media.jpg'], summary: ['Projets'] });
  assert.equal(res.sha, 'newsha');
  assert.equal(calls.length, 1);
  const { files, deletes, baseSha, message } = calls[0];
  assert.equal(baseSha, 'base');
  assert.equal(message, 'admin: mise à jour du portfolio (Projets)');
  assert.deepEqual(files.map(f => f.path.split('/')[0]), ['data', 'assets']);
  const saved = JSON.parse(files[0].text);
  assert.ok(saved.updatedAt);
  assert.ok(saved.projects.items[1].image.startsWith('assets/images/projects/'));
  assert.deepEqual(deletes, ['assets/images/old.webp']); // Media.jpg est encore utilisée
});
