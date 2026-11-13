/* =========================================================================
   Client de l'API REST GitHub.
   SÉCURITÉ : le token vit uniquement dans la variable `token` de ce module.
   Il n'est jamais écrit dans localStorage, sessionStorage, un cookie, l'URL
   ou un fichier. Recharger la page = se reconnecter.
   ========================================================================= */
import { OWNER, REPO, BRANCH, CONTENT_PATH } from './config.js';

const API = 'https://api.github.com';
let token = null;
let tokenExpiration = null;

export class GitHubError extends Error {
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export const hasToken = () => token !== null;
export const getTokenExpiration = () => tokenExpiration;
export function clearToken() { token = null; tokenExpiration = null; }

const repoPath = (path) => `/repos/${OWNER}/${REPO}${path}`;

async function api(path, { method = 'GET', body, accept = 'application/vnd.github+json' } = {}) {
    if (!token) throw new GitHubError('Session expirée : reconnectez-vous.', 401, 'unauthorized');
    let res;
    try {
        res = await fetch(API + path, {
            method,
            headers: {
                Accept: accept,
                Authorization: `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-store'
        });
    } catch {
        throw new GitHubError('Impossible de joindre GitHub. Vérifiez votre connexion.', 0, 'network');
    }
    const exp = res.headers.get('github-authentication-token-expiration');
    if (exp) tokenExpiration = exp;
    if (res.ok) {
        if (res.status === 204) return null;
        return accept.includes('raw') ? res.text() : res.json();
    }
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch { /* corps vide */ }
    if (res.status === 401) throw new GitHubError('Token invalide ou expiré.', 401, 'unauthorized');
    if (res.status === 403 && /rate limit/i.test(detail)) throw new GitHubError('Limite de requêtes GitHub atteinte, réessayez dans quelques minutes.', 403, 'rate_limit');
    if (res.status === 403 || (res.status === 404 && method !== 'GET')) {
        throw new GitHubError('Ce token n\'a pas les droits nécessaires (permission « Contents : Read and write » sur le dépôt du portfolio).', res.status, 'forbidden');
    }
    if (res.status === 404) throw new GitHubError('Élément introuvable sur GitHub.', 404, 'not_found');
    if (res.status === 409 || res.status === 422) throw new GitHubError(detail || 'Conflit avec la version en ligne.', res.status, 'conflict');
    throw new GitHubError(`Erreur GitHub (${res.status}) ${detail}`.trim(), res.status, 'http');
}

/** Vérifie le token puis le garde en mémoire. Retourne le profil GitHub. */
export async function login(candidate) {
    const value = String(candidate || '').trim();
    // Seuls les tokens « fine-grained » (github_pat_…) peuvent être limités à un seul dépôt.
    if (!/^github_pat_[A-Za-z0-9_]{20,}$/.test(value)) {
        throw new GitHubError('Utilisez un token « fine-grained » (il commence par « github_pat_ »), limité au dépôt du portfolio.', 0, 'format');
    }
    token = value;
    try {
        const user = await api('/user');
        if (String(user.login).toLowerCase() !== OWNER.toLowerCase()) {
            throw new GitHubError(`Ce token appartient à « ${user.login} » : seul ${OWNER} peut administrer ce portfolio.`, 403, 'not_owner');
        }
        await api(repoPath(''));
        return user;
    } catch (err) {
        clearToken();
        if (err.code === 'not_found') throw new GitHubError('Ce token n\'a pas accès au dépôt du portfolio.', 404, 'no_repo_access');
        throw err;
    }
}

export async function getHeadSha() {
    const ref = await api(repoPath(`/git/ref/heads/${BRANCH}`));
    return ref.object.sha;
}

/** Contenu texte d'un fichier à une révision donnée (sha de commit ou branche). */
export function readText(path, ref = BRANCH) {
    return api(repoPath(`/contents/${path}?ref=${encodeURIComponent(ref)}`), { accept: 'application/vnd.github.raw+json' });
}

export async function readContent(ref = BRANCH) {
    return JSON.parse(await readText(CONTENT_PATH, ref));
}

/** Fichiers d'un dossier ([] si le dossier n'existe pas). */
export async function listDir(path) {
    try {
        const items = await api(repoPath(`/contents/${path}?ref=${BRANCH}`));
        return Array.isArray(items) ? items.filter(i => i.type === 'file') : [];
    } catch (err) {
        if (err.code === 'not_found') return [];
        throw err;
    }
}

export async function listCommits(path, perPage = 15) {
    const commits = await api(repoPath(`/commits?sha=${BRANCH}&path=${encodeURIComponent(path)}&per_page=${perPage}`));
    return commits.map(c => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        date: c.commit.author?.date || c.commit.committer?.date,
        author: c.author?.login || c.commit.author?.name || ''
    }));
}

/**
 * Publie plusieurs fichiers en UN SEUL commit (API Git Data).
 * files : [{ path, text } | { path, base64 }], deletes : [path]
 * La branche est mise à jour sans « force » : si quelqu'un a modifié le dépôt
 * depuis baseSha, GitHub refuse et on lève une erreur code 'conflict'.
 */
export async function commitChanges({ baseSha, message, files, deletes = [] }) {
    const head = await getHeadSha();
    if (head !== baseSha) throw new GitHubError('Le dépôt a été modifié depuis le chargement de l\'admin.', 409, 'conflict');

    const baseCommit = await api(repoPath(`/git/commits/${baseSha}`));
    const tree = [];
    for (const f of files) {
        const blob = await api(repoPath('/git/blobs'), {
            method: 'POST',
            body: f.base64 !== undefined ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' }
        });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const path of deletes) tree.push({ path, mode: '100644', type: 'blob', sha: null });

    const newTree = await api(repoPath('/git/trees'), { method: 'POST', body: { base_tree: baseCommit.tree.sha, tree } });
    const commit = await api(repoPath('/git/commits'), {
        method: 'POST',
        body: { message, tree: newTree.sha, parents: [baseSha] }
    });
    await api(repoPath(`/git/refs/heads/${BRANCH}`), { method: 'PATCH', body: { sha: commit.sha, force: false } });
    return commit.sha;
}
