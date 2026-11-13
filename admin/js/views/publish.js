import { state, changedSections, markPublished, replaceDraft, discardDraft } from '../store.js';
import * as gh from '../github.js';
import { CONTENT_PATH, SITE_URL } from '../config.js';
import { publish, waitForDeployment } from '../publish.js';
import { validateContent } from '../schema.js';
import { esc, icon, el, toast, dialog, formatDate } from '../ui.js';

let publishing = false;

/** Lance la publication complète (validation → commit → suivi du déploiement). */
export async function runPublish({ force = false } = {}) {
    if (publishing) return;
    const errors = validateContent(state.draft);
    if (errors.length) {
        await dialog({
            title: 'Publication impossible',
            bodyHtml: `<p>Le brouillon contient ${errors.length} erreur(s) à corriger :</p><ul class="error-list">${errors.slice(0, 10).map(e => `<li><code>${esc(e.path)}</code> — ${esc(e.message)}</li>`).join('')}</ul>`,
            buttons: [{ label: 'Compris', value: true, kind: 'primary' }]
        });
        return;
    }
    const summary = changedSections();
    if (!summary.length) { toast('Rien à publier : le portfolio est déjà à jour.', 'info'); return; }
    if (!force) {
        const ok = await dialog({
            title: 'Publier les modifications ?',
            bodyHtml: `<p>Parties modifiées : <strong>${summary.map(esc).join(', ')}</strong>.</p><p class="muted">Un commit sera créé sur GitHub ; le site sera à jour en 1 à 2 minutes. Vous pourrez restaurer la version précédente depuis l'historique.</p>`,
            buttons: [{ label: 'Annuler', value: false }, { label: 'Publier', value: true, kind: 'primary' }]
        });
        if (!ok) return;
    }

    publishing = true;
    document.body.classList.add('is-publishing');
    try {
        let baseSha = state.baseSha;
        if (force) baseSha = await gh.getHeadSha();
        const { sha, content } = await publish({ gh, draft: state.draft, baseSha, pendingDeletes: state.pendingDeletes, summary });
        markPublished(content, sha);
        toast('Publié ! Mise en ligne en cours…');
        watchDeployment(content.updatedAt);
    } catch (err) {
        if (err.code === 'conflict') {
            const choice = await dialog({
                title: 'Le portfolio a été modifié ailleurs',
                body: 'Une autre modification a été enregistrée sur GitHub depuis l\'ouverture de l\'admin (autre onglet, autre appareil ou modification directe du code). Votre brouillon est conservé.',
                buttons: [
                    { label: 'Annuler', value: null },
                    { label: 'Publier mon brouillon quand même', value: 'force', kind: 'danger' }
                ]
            });
            publishing = false;
            document.body.classList.remove('is-publishing');
            if (choice === 'force') return runPublish({ force: true });
            return;
        }
        toast(err.message || 'La publication a échoué.', 'error', 8000);
        if (err.code === 'unauthorized') window.dispatchEvent(new Event('admin:logout'));
    } finally {
        publishing = false;
        document.body.classList.remove('is-publishing');
    }
}

function watchDeployment(updatedAt) {
    const pill = document.querySelector('[data-deploy]');
    const set = (text, kind) => { if (pill) { pill.hidden = false; pill.className = `pill pill-${kind}`; pill.textContent = text; } };
    set('Mise en ligne…', 'warning');
    waitForDeployment(updatedAt, { siteUrl: SITE_URL, onTick: (s) => set(`Mise en ligne… ${s}s`, 'warning') }).then(ok => {
        if (ok) { set('En ligne ✓', 'success'); toast('Le portfolio en ligne est à jour.'); }
        else set('Déploiement long : vérifiez plus tard', 'neutral');
    });
}

export function publishPage() {
    const changes = changedSections();
    const root = el(`<div class="stack">
        <section class="card">
            <header class="card-header"><div><h2>Publier</h2><p class="muted">Toutes les modifications du brouillon sont envoyées en une seule fois.</p></div></header>
            <div class="card-body">
                ${changes.length
                    ? `<p class="chips">${changes.map(c => `<span class="badge badge-warning">${esc(c)}</span>`).join('')}</p>`
                    : '<p class="muted">Aucune modification en attente.</p>'}
                ${state.storageWarning ? `<p class="notice">${icon('alert', 16)} Brouillon trop volumineux pour être conservé localement (images lourdes) : publiez avant de fermer l'onglet. L'aperçu peut ne pas refléter les dernières images.</p>` : ''}
                <div class="actions">
                    <a class="btn btn-ghost" href="../?preview=1" target="_blank" rel="noopener">${icon('eye', 16)}<span>Prévisualiser</span></a>
                    <button type="button" class="btn btn-ghost" data-discard ${changes.length ? '' : 'disabled'}>Abandonner le brouillon</button>
                    <button type="button" class="btn btn-primary" data-publish ${changes.length ? '' : 'disabled'}>${icon('upload', 16)}<span>Publier</span></button>
                </div>
            </div>
        </section>

        <section class="card">
            <header class="card-header"><div><h2>Historique des versions</h2><p class="muted">Chaque publication est une version. Restaurer charge l'ancienne version dans le brouillon : il suffit ensuite de la publier.</p></div></header>
            <ul class="history" data-history><li class="muted">Chargement…</li></ul>
        </section>

        <section class="card">
            <header class="card-header"><div><h2>Sauvegarde</h2><p class="muted">Téléchargez une copie de votre contenu, ou restaurez un fichier exporté.</p></div></header>
            <div class="card-body actions">
                <button type="button" class="btn btn-ghost" data-export>${icon('download', 16)}<span>Exporter le brouillon (JSON)</span></button>
                <label class="btn btn-ghost">${icon('upload', 16)}<span>Importer un JSON</span><input type="file" accept="application/json,.json" data-import hidden></label>
            </div>
        </section>
    </div>`);

    root.querySelector('[data-publish]').addEventListener('click', () => runPublish());
    root.querySelector('[data-discard]').addEventListener('click', async () => {
        const ok = await dialog({
            title: 'Abandonner le brouillon ?',
            body: 'Toutes les modifications non publiées seront perdues et le contenu reviendra à la version en ligne.',
            buttons: [{ label: 'Annuler', value: false }, { label: 'Abandonner', value: true, kind: 'danger' }]
        });
        if (ok) { discardDraft(); toast('Brouillon abandonné.', 'info'); }
    });

    root.querySelector('[data-export]').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(state.draft, null, 2)], { type: 'application/json' });
        const a = el(`<a download="portfolio-content-${new Date().toISOString().slice(0, 10)}.json"></a>`);
        a.href = URL.createObjectURL(blob);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    root.querySelector('[data-import]').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error('Fichier trop volumineux.');
            const data = JSON.parse(await file.text());
            const errors = validateContent(data);
            if (errors.length) throw new Error(`Fichier invalide : ${errors[0].path} — ${errors[0].message}`);
            const ok = await dialog({ title: 'Remplacer le brouillon ?', body: `Le brouillon sera remplacé par « ${file.name} ». Rien n'est publié tant que vous ne cliquez pas sur Publier.`, buttons: [{ label: 'Annuler', value: false }, { label: 'Remplacer', value: true, kind: 'primary' }] });
            if (ok) { replaceDraft(data); toast('Brouillon importé. Prévisualisez puis publiez.'); }
        } catch (err) {
            toast(err instanceof SyntaxError ? 'Ce fichier n\'est pas un JSON valide.' : err.message, 'error');
        }
    });

    const historyEl = root.querySelector('[data-history]');
    gh.listCommits(CONTENT_PATH, 20).then(commits => {
        historyEl.innerHTML = commits.map((c, i) => `<li>
            <div><span class="tl-msg">${esc(c.message)}</span><span class="muted">${esc(formatDate(c.date))}${c.author ? ` · ${esc(c.author)}` : ''} · <code>${esc(c.sha.slice(0, 7))}</code></span></div>
            ${i === 0 ? '<span class="badge badge-success">En ligne</span>' : `<button type="button" class="btn btn-ghost btn-sm" data-restore="${esc(c.sha)}">${icon('history', 14)}<span>Restaurer</span></button>`}
        </li>`).join('') || '<li class="muted">Aucune version.</li>';
    }).catch(err => { historyEl.innerHTML = `<li class="muted">${esc(err.message)}</li>`; });

    historyEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-restore]');
        if (!btn) return;
        const ok = await dialog({
            title: 'Restaurer cette version ?',
            body: 'Elle remplacera votre brouillon actuel. Rien n\'est publié tant que vous ne cliquez pas sur Publier.',
            buttons: [{ label: 'Annuler', value: false }, { label: 'Restaurer dans le brouillon', value: true, kind: 'primary' }]
        });
        if (!ok) return;
        try {
            const old = await gh.readContent(btn.dataset.restore);
            replaceDraft(old);
            toast('Version restaurée dans le brouillon. Vérifiez puis publiez.');
        } catch (err) {
            toast(err.message, 'error');
        }
    });
    return [root];
}
