import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../js/render.js';

const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));

test('escapeHtml neutralise le HTML', () => {
  assert.equal(R.escapeHtml('<script>"x"&\'y\''), '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;');
  assert.equal(R.escapeHtml(undefined), '');
});

test('richText : **gras** et ==surligné== seulement, le reste est échappé', () => {
  assert.equal(R.richText('a **b** ==c== <i>d</i>'), 'a <strong>b</strong> <span class="highlight">c</span> &lt;i&gt;d&lt;/i&gt;');
  assert.equal(R.richText('**<img src=x onerror=alert(1)>**'), '<strong>&lt;img src=x onerror=alert(1)&gt;</strong>');
});

test('safeUrl bloque les schémas dangereux', () => {
  assert.equal(R.safeUrl('javascript:alert(1)'), '#');
  assert.equal(R.safeUrl(' JavaScript:alert(1)'), '#');
  assert.equal(R.safeUrl('data:text/html,<b>'), '#');
  assert.equal(R.safeUrl('https://github.com/x'), 'https://github.com/x');
  assert.equal(R.safeUrl('mailto:a@b.c'), 'mailto:a@b.c');
  assert.equal(R.safeUrl('assets/images/a.webp'), 'assets/images/a.webp');
  assert.equal(R.safeUrl('data:image/webp;base64,AAA'), '#');
  assert.equal(R.safeUrl('data:image/webp;base64,AAA', { allowDataImage: true }), 'data:image/webp;base64,AAA');
});

test('safeIcon valide les classes Font Awesome', () => {
  assert.equal(R.safeIcon('fab fa-github'), 'fab fa-github');
  assert.equal(R.safeIcon('fas fa-x" onmouseover="alert(1)'), 'fas fa-circle');
});

test('un projet malveillant est rendu inoffensif', () => {
  const html = R.renderProjectCard({
    title: '<script>alert(1)</script>', description: '"><img src=x onerror=alert(1)>',
    category: 'x" onclick="alert(1)', categoryLabel: 'c', icon: 'bad', tags: ['<b>'], date: 'd',
    links: { github: 'javascript:alert(1)' }, videoUrl: 'javascript:alert(1)', image: ''
  }, 0);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('" onclick="'));
});

test('numérotation des sections selon la visibilité', () => {
  const c = structuredClone(content);
  assert.equal(R.sectionTag(c, 'skills'), '02 — Compétences');
  c.sections.about.visible = false;
  assert.equal(R.sectionTag(c, 'skills'), '01 — Compétences');
});

test('compétence avec niveau', () => {
  assert.equal(R.renderSkillItem({ name: 'GCP', level: 'Expert' }), '<span class="skill-tag">GCP <small>(Expert)</small></span>');
});

test('rendu complet sans exception', () => {
  for (const fn of ['renderHeroSocial', 'renderAboutParagraphs', 'renderAboutFacts', 'renderStats', 'renderSkills',
    'renderTimeline', 'renderEducation', 'renderCertifications', 'renderProjectFilters', 'renderContactMethods', 'renderFooterSocial']) {
    assert.equal(typeof R[fn](content), 'string', fn);
  }
});

test('projets mis en avant en premier', () => {
  const c = structuredClone(content);
  c.projects.items[5].featured = true;
  assert.equal(R.orderProjects(c.projects.items)[0].id, c.projects.items[5].id);
});

test('aucune section ne laisse passer du HTML, quel que soit le champ empoisonné', () => {
  const payload = '"><img src=x onerror=alert(1)><script>alert(2)</script>javascript:alert(3)';
  const poison = (v) => typeof v === 'string' ? payload : Array.isArray(v) ? v.map(poison)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, poison(x)])) : v;
  const bad = poison(content);
  const html = ['renderHeroSocial', 'renderAboutParagraphs', 'renderAboutFacts', 'renderStats', 'renderSkills',
    'renderTimeline', 'renderEducation', 'renderCertifications', 'renderProjectFilters', 'renderContactMethods', 'renderFooterSocial']
    .map(fn => R[fn](bad)).join('') + bad.projects.items.map((p, i) => R.renderProjectCard(p, i, { allowDataImage: true })).join('')
    + R.richText(bad.profile.heroDescription); // sectionTag() est du texte, inséré via textContent
  assert.ok(!/<img|<script|href="javascript:|src="javascript:/i.test(html), html.slice(0, 300));
});
