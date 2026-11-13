import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as gh from '../admin/js/github.js';

const TOKEN = 'github_pat_' + 'A'.repeat(40);
let calls;
let routes;

function mockFetch() {
  globalThis.fetch = async (url, opts = {}) => {
    const path = url.replace('https://api.github.com', '');
    calls.push({ method: opts.method || 'GET', path, body: opts.body ? JSON.parse(opts.body) : undefined, auth: opts.headers?.Authorization });
    const key = `${opts.method || 'GET'} ${path.split('?')[0]}`;
    const r = routes[key] || { status: 404, body: { message: 'Not Found' } };
    return new Response(r.status === 204 ? null : JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json', ...(r.headers || {}) } });
  };
}

beforeEach(() => {
  calls = [];
  gh.clearToken();
  routes = {
    'GET /user': { status: 200, body: { login: 'yacineberkani' }, headers: { 'github-authentication-token-expiration': '2027-02-11 10:00:00 UTC' } },
    'GET /repos/yacineberkani/yacineberkani.github.io': { status: 200, body: {} },
    'GET /repos/yacineberkani/yacineberkani.github.io/git/ref/heads/main': { status: 200, body: { object: { sha: 'base' } } },
    'GET /repos/yacineberkani/yacineberkani.github.io/git/commits/base': { status: 200, body: { tree: { sha: 'tree0' } } },
    'POST /repos/yacineberkani/yacineberkani.github.io/git/blobs': { status: 201, body: { sha: 'blob1' } },
    'POST /repos/yacineberkani/yacineberkani.github.io/git/trees': { status: 201, body: { sha: 'tree1' } },
    'POST /repos/yacineberkani/yacineberkani.github.io/git/commits': { status: 201, body: { sha: 'commit1' } },
    'PATCH /repos/yacineberkani/yacineberkani.github.io/git/refs/heads/main': { status: 200, body: {} }
  };
  mockFetch();
});

test('login : format refusé pour un token classique (non limité à un dépôt)', async () => {
  await assert.rejects(gh.login('ghp_' + 'A'.repeat(36)), { code: 'format' });
  assert.equal(calls.length, 0);
  assert.equal(gh.hasToken(), false);
});

test('login : token d\'un autre compte refusé et oublié', async () => {
  routes['GET /user'] = { status: 200, body: { login: 'someone-else' } };
  await assert.rejects(gh.login(TOKEN), { code: 'not_owner' });
  assert.equal(gh.hasToken(), false);
});

test('login : token invalide → 401 lisible', async () => {
  routes['GET /user'] = { status: 401, body: { message: 'Bad credentials' } };
  await assert.rejects(gh.login(TOKEN), { code: 'unauthorized' });
  assert.equal(gh.hasToken(), false);
});

test('login OK : token en mémoire, date d\'expiration lue', async () => {
  await gh.login(TOKEN);
  assert.equal(gh.hasToken(), true);
  assert.equal(gh.getTokenExpiration(), '2027-02-11 10:00:00 UTC');
  assert.equal(calls[0].auth, `Bearer ${TOKEN}`);
});

test('commitChanges : blobs → tree → commit → ref sans force', async () => {
  await gh.login(TOKEN);
  calls = [];
  const sha = await gh.commitChanges({
    baseSha: 'base', message: 'm',
    files: [{ path: 'data/content.json', text: '{}' }, { path: 'assets/images/projects/a.webp', base64: 'AAA=' }],
    deletes: ['assets/images/projects/old.webp']
  });
  assert.equal(sha, 'commit1');
  const posts = calls.filter(c => c.method !== 'GET');
  assert.deepEqual(posts.map(c => c.path.split('/').slice(-2).join('/')), ['git/blobs', 'git/blobs', 'git/trees', 'git/commits', 'heads/main']);
  assert.deepEqual(posts[1].body, { content: 'AAA=', encoding: 'base64' });
  assert.equal(posts[2].body.base_tree, 'tree0');
  assert.deepEqual(posts[2].body.tree[2], { path: 'assets/images/projects/old.webp', mode: '100644', type: 'blob', sha: null });
  assert.deepEqual(posts[3].body.parents, ['base']);
  assert.equal(posts[4].body.force, false);
});

test('commitChanges : dépôt modifié entre-temps → conflit, rien n\'est écrit', async () => {
  await gh.login(TOKEN);
  routes['GET /repos/yacineberkani/yacineberkani.github.io/git/ref/heads/main'] = { status: 200, body: { object: { sha: 'other' } } };
  calls = [];
  await assert.rejects(gh.commitChanges({ baseSha: 'base', message: 'm', files: [] }), { code: 'conflict' });
  assert.equal(calls.filter(c => c.method !== 'GET').length, 0);
});

test('commitChanges : mise à jour de ref refusée (non fast-forward) → conflit', async () => {
  await gh.login(TOKEN);
  routes['PATCH /repos/yacineberkani/yacineberkani.github.io/git/refs/heads/main'] = { status: 422, body: { message: 'Update is not a fast forward' } };
  await assert.rejects(gh.commitChanges({ baseSha: 'base', message: 'm', files: [{ path: 'a', text: 'b' }] }), { code: 'conflict' });
});

test('écriture refusée (token en lecture seule) → message explicite', async () => {
  await gh.login(TOKEN);
  routes['POST /repos/yacineberkani/yacineberkani.github.io/git/blobs'] = { status: 403, body: { message: 'Resource not accessible by personal access token' } };
  await assert.rejects(gh.commitChanges({ baseSha: 'base', message: 'm', files: [{ path: 'a', text: 'b' }] }), { code: 'forbidden' });
});

test('le module ne persiste jamais le token', async () => {
  const store = {};
  globalThis.localStorage = { setItem: (k, v) => { store[k] = v; }, getItem: (k) => store[k] ?? null };
  globalThis.sessionStorage = globalThis.localStorage;
  await gh.login(TOKEN);
  assert.equal(Object.values(store).some(v => String(v).includes(TOKEN)), false);
  gh.clearToken();
  assert.equal(gh.hasToken(), false);
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});
