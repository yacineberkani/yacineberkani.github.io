/* =========================================================================
   Back-office — point d'entrée : connexion, structure, navigation, session.
   ========================================================================= */
import * as gh from './github.js';
import * as store from './store.js';
import { IDLE_MINUTES, SITE_URL } from './config.js';
import { esc, icon, el, toast } from './ui.js';
import { dashboardPage } from './views/dashboard.js';
import { profilePage, experiencesPage, projectsPage, skillsPage, educationPage, contentPage } from './views/pages.js';
import { mediaPage } from './views/media.js';
import { publishPage, runPublish } from './views/publish.js';

// Anti-clickjacking : l'admin ne s'exécute jamais dans un cadre (GitHub Pages ne permet pas d'en-têtes HTTP).
if (window.top !== window.self) {
    document.body.textContent = '';
    throw new Error('Admin chargé dans un cadre : arrêt.');
}

const ROUTES = {
    dashboard: { label: 'Tableau de bord', icon: 'dashboard', page: dashboardPage },
    profile: { label: 'Profil', icon: 'user', page: profilePage },
    experiences: { label: 'Expériences', icon: 'briefcase', page: experiencesPage },
    projects: { label: 'Projets', icon: 'folder', page: projectsPage },
    skills: { label: 'Compétences', icon: 'layers', page: skillsPage },
    education: { label: 'Formations & certifications', icon: 'school', page: educationPage },
    content: { label: 'Contenu général', icon: 'text', page: contentPage },
    media: { label: 'Médias', icon: 'image', page: mediaPage },
    publish: { label: 'Publication', icon: 'upload', page: publishPage }
};
const NAV_GROUPS = [['dashboard'], ['profile', 'experiences', 'projects', 'skills', 'education', 'content'], ['media', 'publish']];

const app = document.getElementById('app');
let user = null;
let idleTimer = null;

// ---------------------------------------------------------------- thème
const THEME_KEY = 'admin-theme';
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* rien */ }
}
let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch { /* rien */ }
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

// ---------------------------------------------------------------- session
function logout(reason) {
    gh.clearToken();
    user = null;
    clearTimeout(idleTimer);
    document.querySelector('.panel-backdrop')?.remove();
    renderLogin(reason);
}
window.addEventListener('admin:logout', () => logout('Session expirée ou token révoqué : reconnectez-vous.'));

function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => logout(`Déconnexion automatique après ${IDLE_MINUTES} minutes d'inactivité. Votre brouillon est conservé.`), IDLE_MINUTES * 60000);
}
['pointerdown', 'keydown'].forEach(evt => document.addEventListener(evt, () => { if (user) resetIdle(); }, { passive: true }));

// ---------------------------------------------------------------- connexion
function renderLogin(message = '') {
    app.replaceChildren(el(`<main class="login">
        <form class="login-card" autocomplete="off">
            <div class="brand brand-lg"><span class="logo">&lt;YB/&gt;</span><span>Admin</span></div>
            <h1>Connexion</h1>
            <p class="muted">Collez votre token GitHub « fine-grained » limité au dépôt du portfolio. Il reste en mémoire le temps de la session et n'est jamais enregistré.</p>
            ${message ? `<p class="notice">${icon('alert', 16)} ${esc(message)}</p>` : ''}
            <label for="token">Token GitHub</label>
            <input id="token" name="token" type="password" placeholder="github_pat_…" autocomplete="off" spellcheck="false" required>
            <p class="error" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">${icon('key', 16)}<span>Se connecter</span></button>
            <p class="hint">Pas encore de token ? Suivez le guide <a href="https://github.com/yacineberkani/yacineberkani.github.io/blob/main/docs/admin.md" target="_blank" rel="noopener">docs/admin.md</a>.</p>
        </form></main>`));
    const form = app.querySelector('form');
    const input = form.querySelector('#token');
    const error = form.querySelector('.error');
    input.focus();
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Vérification…';
        error.hidden = true;
        try {
            user = await gh.login(input.value);
            input.value = '';
            await loadAndStart();
        } catch (err) {
            user = null;
            error.textContent = err.message;
            error.hidden = false;
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Se connecter';
        }
    });
}

async function loadAndStart() {
    const baseSha = await gh.getHeadSha();
    const published = await gh.readContent(baseSha);
    const restored = store.init(published, baseSha);
    renderShell();
    resetIdle();
    if (restored) toast('Brouillon non publié restauré.', 'info', 6000);
    if (!location.hash) location.hash = '#/dashboard';
    route();
}

// ---------------------------------------------------------------- structure
function renderShell() {
    const nav = NAV_GROUPS.map(group => `<div class="nav-group">${group.map(key =>
        `<a class="nav-item" href="#/${key}" data-route="${key}">${icon(ROUTES[key].icon)}<span>${esc(ROUTES[key].label)}</span>${key === 'publish' ? '<span class="nav-dot" data-dirty-dot hidden></span>' : ''}</a>`
    ).join('')}</div>`).join('');

    app.replaceChildren(el(`<div class="shell">
        <aside class="sidebar" id="sidebar">
            <div class="brand"><span class="logo">&lt;YB/&gt;</span><span>Admin</span></div>
            <nav aria-label="Navigation principale">${nav}</nav>
            <div class="sidebar-footer">
                <a class="nav-item" href="${SITE_URL}" target="_blank" rel="noopener">${icon('external')}<span>Voir le site</span></a>
                <div class="user">
                    ${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="">` : ''}
                    <span class="user-name">${esc(user.login)}</span>
                    <button type="button" class="icon-btn" data-theme-toggle aria-label="Changer de thème">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 16)}</button>
                    <button type="button" class="icon-btn" data-logout aria-label="Se déconnecter" title="Se déconnecter">${icon('logout', 16)}</button>
                </div>
            </div>
        </aside>
        <div class="sidebar-scrim" data-close-nav></div>
        <div class="main">
            <header class="topbar">
                <button type="button" class="icon-btn menu-btn" data-open-nav aria-label="Menu">${icon('menu')}</button>
                <h1 class="page-title" data-title></h1>
                <span class="pill" data-deploy hidden></span>
                <span class="pill pill-warning" data-dirty hidden></span>
                <div class="topbar-actions">
                    <a class="btn btn-ghost btn-sm" href="../?preview=1" target="_blank" rel="noopener">${icon('eye', 16)}<span class="hide-sm">Aperçu</span></a>
                    <button type="button" class="btn btn-primary btn-sm" data-publish>${icon('upload', 16)}<span class="hide-sm">Publier</span></button>
                </div>
            </header>
            <main class="content" id="content" tabindex="-1"></main>
        </div>
    </div>`));

    app.querySelector('[data-logout]').addEventListener('click', () => logout('Vous êtes déconnecté. Votre brouillon est conservé sur cet appareil.'));
    app.querySelector('[data-theme-toggle]').addEventListener('click', (e) => {
        applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
        e.currentTarget.innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 16);
    });
    app.querySelector('[data-publish]').addEventListener('click', () => runPublish());
    app.querySelector('[data-open-nav]').addEventListener('click', () => document.body.classList.add('nav-open'));
    app.querySelector('[data-close-nav]').addEventListener('click', () => document.body.classList.remove('nav-open'));
    updateDirty();
}
store.onChange(updateDirty);

function updateDirty() {
    const changes = store.changedSections();
    const pill = app.querySelector('[data-dirty]');
    if (!pill) return;
    pill.hidden = !changes.length;
    pill.textContent = `${changes.length} modification${changes.length > 1 ? 's' : ''} non publiée${changes.length > 1 ? 's' : ''}`;
    pill.title = changes.join(', ');
    app.querySelector('[data-dirty-dot]').hidden = !changes.length;
    app.querySelector('[data-publish]').disabled = !changes.length;
}

// ---------------------------------------------------------------- routeur
function route() {
    if (!user) return;
    const key = (location.hash.replace(/^#\//, '') || 'dashboard');
    const r = ROUTES[key] || ROUTES.dashboard;
    document.body.classList.remove('nav-open');
    app.querySelectorAll('.nav-item[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === key));
    app.querySelector('[data-title]').textContent = r.label;
    document.title = `${r.label} · Admin portfolio`;
    const content = app.querySelector('#content');
    content.replaceChildren(...r.page());
    content.scrollTop = 0;
    window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
// Le tableau de bord et la publication reflètent l'état du brouillon : on les rafraîchit après publication.
store.onChange(() => {
    const key = location.hash.replace(/^#\//, '');
    if ((key === 'publish' || key === 'dashboard') && !document.querySelector('.panel-backdrop, dialog[open]')) route();
});

renderLogin();
