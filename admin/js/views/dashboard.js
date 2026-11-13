import { state, changedSections } from '../store.js';
import * as gh from '../github.js';
import { CONTENT_PATH, SITE_URL } from '../config.js';
import { esc, icon, el, formatDate } from '../ui.js';
import { AVAILABILITY } from '../schema.js';

export function dashboardPage() {
    const d = state.draft;
    const items = d.projects.items;
    const stats = [
        { label: 'Projets', value: items.length, sub: `${items.filter(p => p.featured).length} mis en avant`, href: '#/projects', ic: 'folder' },
        { label: 'Expériences', value: d.experiences.length, sub: d.experiences[0] ? `Dernière : ${d.experiences[0].company}` : '—', href: '#/experiences', ic: 'briefcase' },
        { label: 'Compétences', value: d.skills.categories.reduce((n, c) => n + c.items.length, 0), sub: `${d.skills.categories.length} catégories`, href: '#/skills', ic: 'layers' },
        { label: 'Formations & certifications', value: d.education.length + d.certifications.length, sub: `${d.certifications.length} certifications`, href: '#/education', ic: 'school' }
    ];
    const changes = changedSections();
    const hidden = Object.entries(d.sections).filter(([, s]) => !s.visible).length;
    const expiration = gh.getTokenExpiration();

    const root = el(`<div class="stack">
        <div class="stat-grid">${stats.map(s => `<a class="stat" href="${s.href}">
            <span class="stat-icon">${icon(s.ic, 18)}</span>
            <span class="stat-label">${esc(s.label)}</span>
            <span class="stat-value">${s.value}</span>
            <span class="stat-sub">${esc(s.sub)}</span></a>`).join('')}</div>

        <div class="grid-2">
            <section class="card">
                <header class="card-header"><div><h2>État du brouillon</h2></div></header>
                <div class="card-body">
                    ${changes.length
                        ? `<p><strong>${changes.length} partie(s) modifiée(s)</strong> non publiée(s) :</p><p class="chips">${changes.map(c => `<span class="badge badge-warning">${esc(c)}</span>`).join('')}</p>
                           <div class="actions"><a class="btn btn-ghost btn-sm" href="../?preview=1" target="_blank" rel="noopener">${icon('eye', 16)}<span>Prévisualiser</span></a><a class="btn btn-primary btn-sm" href="#/publish">${icon('upload', 16)}<span>Publier</span></a></div>`
                        : `<p class="muted">${icon('check', 16)} Tout est publié. Le portfolio en ligne est à jour.</p>`}
                </div>
            </section>
            <section class="card">
                <header class="card-header"><div><h2>Portfolio</h2></div></header>
                <div class="card-body">
                    <dl class="kv">
                        <dt>Disponibilité</dt><dd>${esc(AVAILABILITY[d.profile.availability.status] || d.profile.availability.status)}</dd>
                        <dt>Sections masquées</dt><dd>${hidden || 'Aucune'}</dd>
                        <dt>Site</dt><dd><a href="${SITE_URL}" target="_blank" rel="noopener">${esc(SITE_URL.replace('https://', ''))} ${icon('external', 14)}</a></dd>
                        ${expiration ? `<dt>Expiration du token</dt><dd>${esc(formatDate(expiration.replace(' UTC', 'Z').replace(' ', 'T')))}</dd>` : ''}
                    </dl>
                </div>
            </section>
        </div>

        <section class="card">
            <header class="card-header"><div><h2>Dernières publications</h2></div><a class="btn btn-ghost btn-sm" href="#/publish">${icon('history', 16)}<span>Historique</span></a></header>
            <ul class="timeline-list" data-commits><li class="muted">Chargement…</li></ul>
        </section>
    </div>`);

    gh.listCommits(CONTENT_PATH, 5).then(commits => {
        root.querySelector('[data-commits]').innerHTML = commits.length
            ? commits.map(c => `<li><span class="dot"></span><span class="tl-msg">${esc(c.message)}</span><span class="muted">${esc(formatDate(c.date))}${c.author ? ` · ${esc(c.author)}` : ''}</span></li>`).join('')
            : '<li class="muted">Aucune publication pour l\'instant.</li>';
    }).catch(err => {
        root.querySelector('[data-commits]').innerHTML = `<li class="muted">${esc(err.message)}</li>`;
    });
    return [root];
}
