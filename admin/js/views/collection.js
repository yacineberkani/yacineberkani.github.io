/* =========================================================================
   Vue générique « liste d'éléments » : tableau, ordre (glisser-déposer ou
   flèches), ajout, édition dans un panneau, duplication, suppression
   confirmée. Utilisée pour expériences, projets, compétences, etc.
   ========================================================================= */
import { state, update, getPath, setPath } from '../store.js';
import { esc, icon, el, toast, openPanel, confirmDelete } from '../ui.js';
import { renderForm, readForm, showErrors, imageSrc } from '../form.js';
import { validateContent } from '../schema.js';
import { slugify } from '../images.js';

/**
 * cfg : {
 *   path: 'projects.items', title, description, singular ('un projet'),
 *   fields, newItem: () => ({...}), itemTitle(item), itemMeta(item) → string,
 *   badges(item) → [{ label, kind }], thumb(item) → chemin d'image ou '', addLabel
 * }
 */
export function collectionView(cfg) {
    const root = el(`<section class="card">
        <header class="card-header">
            <div><h2>${esc(cfg.title)}</h2>${cfg.description ? `<p class="muted">${esc(cfg.description)}</p>` : ''}</div>
            <button type="button" class="btn btn-primary btn-sm" data-add>${icon('plus', 16)}<span>${esc(cfg.addLabel || 'Ajouter')}</span></button>
        </header>
        <ul class="rows" role="list"></ul>
    </section>`);
    const listEl = root.querySelector('.rows');
    const items = () => getPath(state.draft, cfg.path) || [];

    function render() {
        const list = items();
        if (!list.length) {
            listEl.innerHTML = `<li class="empty">Aucun élément pour l'instant.</li>`;
            return;
        }
        listEl.innerHTML = list.map((item, i) => {
            const thumb = cfg.thumb ? imageSrc(cfg.thumb(item)) : '';
            const badges = (cfg.badges?.(item) || []).map(b => `<span class="badge badge-${b.kind || 'neutral'}">${esc(b.label)}</span>`).join('');
            return `<li class="row" draggable="true" data-i="${i}">
                <span class="drag" title="Glisser pour réordonner">${icon('grip', 16)}</span>
                ${cfg.thumb ? `<span class="thumb">${thumb ? `<img src="${esc(thumb)}" alt="">` : icon('image', 16)}</span>` : ''}
                <button type="button" class="row-main" data-edit>
                    <span class="row-title">${esc(cfg.itemTitle(item) || 'Sans titre')}</span>
                    <span class="row-meta">${esc(cfg.itemMeta?.(item) || '')}</span>
                </button>
                <span class="row-badges">${badges}</span>
                <span class="row-actions">
                    <button type="button" class="icon-btn" data-move="-1" aria-label="Monter" ${i === 0 ? 'disabled' : ''}>${icon('up', 16)}</button>
                    <button type="button" class="icon-btn" data-move="1" aria-label="Descendre" ${i === list.length - 1 ? 'disabled' : ''}>${icon('down', 16)}</button>
                    <button type="button" class="icon-btn" data-edit aria-label="Modifier">${icon('edit', 16)}</button>
                    <button type="button" class="icon-btn" data-dup aria-label="Dupliquer">${icon('copy', 16)}</button>
                    <button type="button" class="icon-btn danger" data-del aria-label="Supprimer">${icon('trash', 16)}</button>
                </span>
            </li>`;
        }).join('');
    }

    function move(from, to) {
        if (to < 0 || to >= items().length || from === to) return;
        update(d => {
            const list = getPath(d, cfg.path);
            const [it] = list.splice(from, 1);
            list.splice(to, 0, it);
        });
        render();
        toast('Ordre mis à jour (brouillon).');
    }

    function uniqueId(base) {
        const taken = new Set(items().map(i => i.id));
        const stem = (cfg.idPrefix || '') + slugify(base);
        let id = stem;
        for (let n = 2; taken.has(id); n++) id = `${stem}-${n}`;
        return id;
    }

    function edit(index) {
        const isNew = index === -1;
        const original = isNew ? cfg.newItem() : items()[index];
        const form = renderForm(cfg.fields, original);
        openPanel(isNew ? `Ajouter ${cfg.singular}` : `Modifier ${cfg.singular}`, form, {
            saveLabel: isNew ? 'Ajouter' : 'Enregistrer',
            onSave: () => {
                const item = readForm(form, cfg.fields, original);
                if (!item.id) item.id = uniqueId(cfg.itemTitle(item));
                const candidate = structuredClone(state.draft);
                const list = getPath(candidate, cfg.path);
                const at = isNew ? list.length : index;
                list[at] = item;
                const prefix = `${cfg.path}[${at}]`;
                const errors = validateContent(candidate).filter(e => e.path === prefix || e.path.startsWith(prefix + '.') || e.path.startsWith(prefix + '['));
                if (errors.length) {
                    const shown = showErrors(form, errors, prefix);
                    toast(shown ? 'Corrigez les champs signalés.' : errors[0].message, 'error');
                    return false;
                }
                update(d => setPath(d, cfg.path, list));
                render();
                toast(isNew ? 'Élément ajouté au brouillon.' : 'Modifications enregistrées dans le brouillon.');
                return true;
            }
        });
    }

    root.querySelector('[data-add]').addEventListener('click', () => edit(-1));
    listEl.addEventListener('click', async (e) => {
        const row = e.target.closest('.row');
        if (!row) return;
        const i = +row.dataset.i;
        if (e.target.closest('[data-edit]')) edit(i);
        else if (e.target.closest('[data-move]')) move(i, i + +e.target.closest('[data-move]').dataset.move);
        else if (e.target.closest('[data-dup]')) {
            const copy = structuredClone(items()[i]);
            copy.id = uniqueId(cfg.itemTitle(copy) + '-copie');
            update(d => getPath(d, cfg.path).splice(i + 1, 0, copy));
            render();
            toast('Élément dupliqué.');
        } else if (e.target.closest('[data-del]')) {
            if (await confirmDelete(cfg.itemTitle(items()[i]) || 'cet élément')) {
                update(d => getPath(d, cfg.path).splice(i, 1));
                render();
                toast('Élément supprimé du brouillon.');
            }
        }
    });

    // Glisser-déposer
    let dragFrom = null;
    listEl.addEventListener('dragstart', (e) => {
        const row = e.target.closest('.row');
        if (!row) return;
        dragFrom = +row.dataset.i;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    listEl.addEventListener('dragover', (e) => {
        if (dragFrom === null) return;
        e.preventDefault();
        listEl.querySelectorAll('.drop-target').forEach(r => r.classList.remove('drop-target'));
        e.target.closest('.row')?.classList.add('drop-target');
    });
    listEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const row = e.target.closest('.row');
        if (row && dragFrom !== null) move(dragFrom, +row.dataset.i);
    });
    listEl.addEventListener('dragend', () => {
        dragFrom = null;
        listEl.querySelectorAll('.dragging, .drop-target').forEach(r => r.classList.remove('dragging', 'drop-target'));
    });

    render();
    return root;
}

/**
 * Formulaire « simple » sur des champs du brouillon (clés en notation pointée
 * depuis la racine, ex. 'profile.firstName'). Bouton Enregistrer en bas.
 */
export function formView({ title, description, fields }) {
    const root = el(`<section class="card">
        <header class="card-header"><div><h2>${esc(title)}</h2>${description ? `<p class="muted">${esc(description)}</p>` : ''}</div></header>
        <div class="card-body"></div>
        <footer class="card-footer"><button type="button" class="btn btn-ghost" data-reset>Annuler les changements</button><button type="button" class="btn btn-primary" data-save>${icon('check', 16)}<span>Enregistrer</span></button></footer>
    </section>`);
    let form;
    const mount = () => {
        form = renderForm(fields, state.draft);
        root.querySelector('.card-body').replaceChildren(form);
    };
    root.querySelector('[data-reset]').addEventListener('click', () => { mount(); toast('Formulaire rechargé depuis le brouillon.', 'info'); });
    root.querySelector('[data-save]').addEventListener('click', () => {
        const candidate = readForm(form, fields, state.draft);
        const shown = showErrors(form, validateContent(candidate));
        if (shown) { toast('Corrigez les champs signalés.', 'error'); return; }
        update(d => Object.assign(d, candidate));
        toast('Enregistré dans le brouillon.');
    });
    mount();
    return root;
}
