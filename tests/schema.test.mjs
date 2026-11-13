import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent } from '../admin/js/schema.js';

const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));

test('le content.json réel est valide', () => {
  assert.deepEqual(validateContent(content), []);
});

test('champ requis manquant → erreur avec chemin', () => {
  const c = structuredClone(content);
  c.experiences[1].role = '  ';
  const errs = validateContent(c);
  assert.equal(errs.length, 1);
  assert.equal(errs[0].path, 'experiences[1].role');
});

test('URL invalide refusée', () => {
  const c = structuredClone(content);
  c.certifications[0].url = 'javascript:alert(1)';
  assert.ok(validateContent(c).some(e => e.path === 'certifications[0].url'));
});

test('ids en double refusés', () => {
  const c = structuredClone(content);
  c.projects.items[1].id = c.projects.items[0].id;
  assert.ok(validateContent(c).some(e => e.path === 'projects.items[1].id'));
});

test('catégorie de projet inconnue refusée', () => {
  const c = structuredClone(content);
  c.projects.items[0].category = 'zzz';
  assert.ok(validateContent(c).some(e => e.path === 'projects.items[0].category'));
});

test('statistique non numérique refusée', () => {
  const c = structuredClone(content);
  c.stats[0].value = 'abc';
  assert.ok(validateContent(c).some(e => e.path === 'stats[0].value'));
});

test('objet non conforme → erreur racine sans exception', () => {
  assert.ok(validateContent(null).length > 0);
  assert.ok(validateContent({}).length > 0);
});
