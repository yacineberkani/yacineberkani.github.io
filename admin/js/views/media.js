import { state, toggleDelete } from '../store.js';
import * as gh from '../github.js';
import { IMAGE_DIRS } from '../config.js';
import { referencedImages } from '../publish.js';
import { esc, icon, el, toast } from '../ui.js';

export function mediaPage() {
    const root = el(`<section class="card">
        <header class="card-header"><div><h2>Bibliothèque d'images</h2>
            <p class="muted">Images du dépôt. Les nouvelles images s'importent depuis le profil ou un projet ; elles sont envoyées à la publication.
            Une image inutilisée peut être supprimée : la suppression s'applique à la prochaine publication.</p></div></header>
        <div class="media-grid" data-grid><p class="muted">Chargement…</p></div>
    </section>`);
    const grid = root.querySelector('[data-grid]');

    Promise.all(IMAGE_DIRS.map(gh.listDir)).then(lists => {
        const files = lists.flat().filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f.name));
        const render = () => {
            const used = referencedImages(state.draft);
            grid.innerHTML = files.length ? files.map(f => {
                const isUsed = used.has(f.path);
                const marked = state.pendingDeletes.includes(f.path);
                return `<figure class="media${marked ? ' marked' : ''}">
                    <img src="${esc(f.download_url)}" alt="" loading="lazy">
                    <figcaption>
                        <span class="media-name" title="${esc(f.path)}">${esc(f.name)}</span>
                        <span class="muted">${Math.round(f.size / 1024)} Ko · ${isUsed ? 'utilisée' : 'inutilisée'}</span>
                        ${isUsed ? '' : `<button type="button" class="btn btn-${marked ? 'ghost' : 'danger'} btn-sm" data-path="${esc(f.path)}">${marked ? 'Conserver' : `${icon('trash', 14)}<span>Supprimer</span>`}</button>`}
                    </figcaption></figure>`;
            }).join('') : '<p class="muted">Aucune image.</p>';
        };
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-path]');
            if (!btn) return;
            toggleDelete(btn.dataset.path);
            toast(state.pendingDeletes.includes(btn.dataset.path) ? 'Image marquée pour suppression (à la publication).' : 'Image conservée.', 'info');
            render();
        });
        render();
    }).catch(err => { grid.innerHTML = `<p class="muted">${esc(err.message)}</p>`; });
    return [root];
}
