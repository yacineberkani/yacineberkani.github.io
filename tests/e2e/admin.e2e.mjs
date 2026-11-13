// Tests de bout en bout du back-office, API GitHub simulée (aucun appel réel).
// Prérequis : Playwright (préinstallé ou `npm i -D playwright`) et un serveur local :
//   python3 -m http.server 8123   puis   node tests/e2e/admin.e2e.mjs
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8123/';
const SHOTS = process.env.SHOTS_DIR;
const TOKEN = 'github_pat_' + 'E2E'.repeat(10);
const root = new URL('../../', import.meta.url);
const initialContent = readFileSync(new URL('data/content.json', root), 'utf8');
const initialIndex = readFileSync(new URL('index.html', root), 'utf8');

function fakeGitHub() {
  const repo = { head: 'c0', commits: { c0: { files: { 'data/content.json': initialContent, 'index.html': initialIndex }, message: 'initial', date: '2026-11-01T10:00:00Z' } }, blobs: {}, trees: {}, log: [] };
  let n = 0;
  return {
    repo,
    async handle(route) {
      const req = route.request();
      const url = new URL(req.url());
      const p = url.pathname.replace('/repos/yacineberkani/yacineberkani.github.io', '');
      const method = req.method();
      repo.log.push(`${method} ${p}`);
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
      if (req.headers().authorization !== `Bearer ${TOKEN}`) return json(401, { message: 'Bad credentials' });
      if (p === '/user') return json(200, { login: 'yacineberkani', avatar_url: '' });
      if (p === '' ) return json(200, { full_name: 'yacineberkani/yacineberkani.github.io' });
      if (p === '/git/ref/heads/main') return json(200, { object: { sha: repo.head } });
      if (p.startsWith('/contents/')) {
        const path = decodeURIComponent(p.slice('/contents/'.length));
        const ref = url.searchParams.get('ref');
        const sha = ref === 'main' ? repo.head : ref;
        const files = repo.commits[sha]?.files || {};
        if (path.startsWith('assets/images')) {
          const list = Object.keys(files).filter(f => f.startsWith(path + '/') && !f.slice(path.length + 1).includes('/'))
            .map(f => ({ type: 'file', name: f.split('/').pop(), path: f, size: 2048, download_url: BASE + f }));
          if (path === 'assets/images') list.push({ type: 'file', name: 'Media.jpg', path: 'assets/images/Media.jpg', size: 54758, download_url: BASE + 'assets/images/Media.jpg' }, { type: 'file', name: 'old-unused.jpg', path: 'assets/images/old-unused.jpg', size: 3000, download_url: BASE + 'assets/images/profile.jpg' });
          return json(200, list);
        }
        if (!(path in files)) return json(404, { message: 'Not Found' });
        return route.fulfill({ status: 200, contentType: 'text/plain', body: files[path], headers: { 'access-control-allow-origin': '*' } });
      }
      if (p === '/commits') {
        const out = []; let s = repo.head;
        while (s) { out.push({ sha: s, commit: { message: repo.commits[s].message, author: { date: repo.commits[s].date } }, author: { login: 'yacineberkani' } }); s = repo.commits[s].parent; }
        return json(200, out);
      }
      if (p.startsWith('/git/commits/') && method === 'GET') return json(200, { tree: { sha: 't-' + p.split('/').pop() } });
      const body = req.postDataJSON?.();
      if (p === '/git/blobs') { const sha = 'b' + (++n); repo.blobs[sha] = body; return json(201, { sha }); }
      if (p === '/git/trees') { const sha = 't' + (++n); repo.trees[sha] = body; return json(201, { sha }); }
      if (p === '/git/commits') {
        const sha = 'c' + (++n); const tree = repo.trees[body.tree];
        const files = { ...repo.commits[body.parents[0]].files };
        for (const e of tree.tree) { if (e.sha === null) delete files[e.path]; else { const b = repo.blobs[e.sha]; files[e.path] = b.encoding === 'utf-8' ? b.content : '[binary]'; } }
        repo.commits[sha] = { files, message: body.message, parent: body.parents[0], date: new Date().toISOString() };
        return json(201, { sha });
      }
      if (p === '/git/refs/heads/main' && method === 'PATCH') {
        if (repo.commits[body.sha].parent !== repo.head && !body.force) return json(422, { message: 'Update is not a fast forward' });
        repo.head = body.sha; return json(200, {});
      }
      return json(404, { message: 'Not Found ' + p });
    }
  };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
const gh = fakeGitHub();
await ctx.route('https://api.github.com/**', r => gh.handle(r));
await ctx.route('https://yacineberkani.github.io/data/content.json*', r =>
  r.fulfill({ status: 200, contentType: 'application/json', body: gh.repo.commits[gh.repo.head].files['data/content.json'] }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
const shot = async (name) => { if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const step = (s) => console.log('✓', s);

await page.goto(BASE + 'admin/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await shot('01-login');

// Connexion refusée puis acceptée
await page.fill('#token', 'ghp_classic_token_aaaaaaaaaaaaaaaaaaaaaa');
await page.click('button[type=submit]');
await page.waitForSelector('.login .error:not([hidden])');
assert.match(await page.textContent('.login .error'), /fine-grained/);
await page.fill('#token', 'github_pat_' + 'X'.repeat(30));
await page.click('button[type=submit]');
await page.waitForFunction(() => /invalide/.test(document.querySelector('.login .error')?.textContent || ''));
step('token classique et token invalide refusés');

await page.fill('#token', TOKEN);
await page.click('button[type=submit]');
await page.waitForSelector('.stat-grid');
assert.equal(await page.textContent('[data-title]'), 'Tableau de bord');
await page.waitForSelector('[data-commits] li .tl-msg');
await shot('02-dashboard');
step('connexion + tableau de bord');

// Le token n'est stocké nulle part
const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie + location.href);
assert.ok(!storage.includes(TOKEN));
step('token absent de localStorage/sessionStorage/cookies/URL');

// Profil : modification + validation
await page.click('a[data-route=profile]');
await page.waitForSelector('[data-key="profile.title"] input');
await shot('03-profile');
await page.fill('[data-key="profile.firstName"] input', '');
await page.locator('.card').first().locator('[data-save]').click();
await page.waitForSelector('[data-key="profile.firstName"].invalid');
step('validation : prénom vide refusé');
await page.fill('[data-key="profile.firstName"] input', 'Yacine');
await page.fill('[data-key="profile.title"] input', 'AI Engineer');
await page.selectOption('[data-key="profile.availability.status"] select', 'freelance');
await page.locator('.card').first().locator('[data-save]').click();
await page.waitForSelector('[data-dirty]:not([hidden])');
step('profil enregistré dans le brouillon, indicateur de modifications visible');

// Projets : ajout avec injection, image, suppression avec confirmation
await page.click('a[data-route=projects]');
await page.waitForSelector('.row');
await shot('04-projects');
const before = await page.locator('.card').first().locator('.row').count();
await page.locator('.card').first().locator('[data-add]').click();
await page.waitForSelector('.panel');
await page.fill('.panel [data-key=title] input', '<img src=x onerror=window.__xss=1>Projet test');
await page.fill('.panel [data-key=description] textarea', 'Description de test');
await page.fill('.panel [data-key=categoryLabel] input', 'Test');
await page.fill('.panel [data-key="links.github"] input', 'javascript:alert(1)');
await page.click('.panel [data-save]');
await page.waitForSelector('.panel [data-key="links.github"].invalid');
step('lien javascript: refusé');
await page.fill('.panel [data-key="links.github"] input', 'https://github.com/yacineberkani/test');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAU0lEQVR4nO3PQQ3AIADAQEAoApCLoongcVnSU9DOfe74s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaB94igB+jrxLJ0AAAAASUVORK5CYII=', 'base64');
await page.setInputFiles('.panel [data-key=image] input[type=file]', { name: 'shot.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('.panel [data-key=image] .image-preview img');
await page.setInputFiles('.panel [data-key=image] input[type=file]', { name: 'evil.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"/>') });
await page.waitForSelector('.toast-error');
step('image PNG convertie, SVG refusé');
await shot('05-panel');
await page.click('.panel [data-save]');
await page.waitForSelector('.panel-backdrop', { state: 'detached' });
assert.equal(await page.locator('.card').first().locator('.row').count(), before + 1);
await page.locator('.card').first().locator('.row').nth(0).locator('[data-del]').click();
await page.waitForSelector('dialog[open]');
await shot('06-confirm');
await page.click('dialog[open] .btn-danger');
assert.equal(await page.locator('.card').first().locator('.row').count(), before);
await page.locator('.card').first().locator('.row').nth(0).locator('[data-move="1"]').click();
step('projet ajouté, supprimé (avec confirmation), réordonné');

// Contenu : masquer une section
await page.click('a[data-route=content]');
await page.locator('[data-key="sections.skills.visible"] .switch').click();
await page.locator('.card').first().locator('[data-save]').click();
await shot('07-content');

// Aperçu sur le vrai portfolio
const preview = await ctx.newPage();
await preview.goto(BASE + '?preview=1');
await preview.waitForSelector('.project-card');
assert.equal(await preview.$eval('#skills', e => e.style.display), 'none');
assert.equal(await preview.evaluate(() => window.__xss), undefined);
assert.ok((await preview.locator('.project-title').allTextContents()).some(t => t.includes('<img')));
assert.match(await preview.textContent('#heroAvailability'), /Disponible/);
await preview.close();
step('aperçu : brouillon visible sur le portfolio, injection neutralisée');

// Médias : marquer une image inutilisée
await page.click('a[data-route=media]');
await page.waitForSelector('.media');
await page.locator('.media', { hasText: 'old-unused.jpg' }).locator('button').click();

// Publication
await page.click('a[data-route=publish]');
await page.waitForSelector('[data-history] li');
await shot('08-publish');
await page.click('.topbar [data-publish]');
await page.click('dialog[open] .btn-primary');
await page.waitForFunction(() => document.querySelector('[data-deploy]')?.textContent.includes('En ligne'), null, { timeout: 15000 });
const head = gh.repo.commits[gh.repo.head];
const published = JSON.parse(head.files['data/content.json']);
assert.equal(published.profile.title, 'AI Engineer');
assert.equal(published.sections.skills.visible, false);
assert.ok(published.projects.items.some(p => p.title.includes('Projet test') && /^assets\/images\/projects\/[a-z0-9-]+-[0-9a-f]{8}\.webp$/.test(p.image)));
assert.ok(Object.keys(head.files).some(f => f.startsWith('assets/images/projects/')));
assert.equal(gh.repo.log.filter(l => l === 'POST /git/commits').length, 1);
assert.ok(!(await page.isVisible('[data-dirty]')), 'pill: ' + await page.getAttribute('[data-dirty]', 'title'));
const tree = Object.values(gh.repo.trees).pop().tree;
assert.ok(tree.some(e => e.path === 'assets/images/old-unused.jpg' && e.sha === null));
step('publication : 1 commit (JSON + image + suppression), déploiement détecté');

// Conflit : quelqu'un publie ailleurs
await page.click('a[data-route=profile]');
await page.fill('[data-key="profile.title"] input', 'AI Engineer & Data Scientist');
await page.locator('.card').first().locator('[data-save]').click();
gh.repo.commits['cX'] = { ...gh.repo.commits[gh.repo.head], parent: gh.repo.head, message: 'modif ailleurs', date: new Date().toISOString() };
gh.repo.head = 'cX';
await page.click('.topbar [data-publish]');
await page.click('dialog[open] .btn-primary');
await page.waitForSelector('dialog[open] .btn-danger');
assert.match(await page.textContent('dialog[open]'), /modifié ailleurs/);
await page.click('dialog[open] .btn-danger');
for (let i = 0; i < 100 && gh.repo.head === 'cX'; i++) await page.waitForTimeout(100);
assert.equal(gh.repo.commits[gh.repo.head].parent, 'cX');
assert.equal(JSON.parse(gh.repo.commits[gh.repo.head].files['data/content.json']).profile.title, 'AI Engineer & Data Scientist');
step('conflit détecté, publication forcée sur la nouvelle version');

// Historique : restaurer une ancienne version
await page.click('a[data-route=publish]');
await page.waitForSelector('[data-restore]');
await page.locator('[data-restore]').last().click();
await page.click('dialog[open] .btn-primary');
await page.waitForSelector('[data-dirty]:not([hidden])');
assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('portfolio-admin-draft')).content.profile.title), 'ML Engineer');
step('restauration d\'une ancienne version dans le brouillon');

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.click('[data-open-nav]');
await page.waitForTimeout(250);
await shot('09-mobile-nav');
await page.click('a[data-route=experiences]');
await page.waitForSelector('.row');
await page.waitForTimeout(400);
assert.equal(await page.evaluate(() => document.querySelector('#sidebar').getBoundingClientRect().right <= 0), true);
await shot('10-mobile-experiences');
step('navigation mobile');

// Déconnexion : token oublié
await page.setViewportSize({ width: 1360, height: 860 });
await page.click('[data-logout]');
await page.waitForSelector('.login');
step('déconnexion');

assert.deepEqual(errors, []);
await browser.close();
console.log('\nTous les scénarios E2E sont passés.');
