/* =========================================================================
   Petits composants d'interface : icônes, toasts, confirmation, panneau.
   Tout texte dynamique passe par esc() (échappement HTML).
   ========================================================================= */
export { escapeHtml as esc } from '../../js/render.js';
import { escapeHtml as esc } from '../../js/render.js';

// Icônes SVG inline (style trait, 24×24) — aucune police ni CDN externe.
const PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    school: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    upload: '<path d="M12 15V3m0 0 4 4m-4-4L8 7"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'
};

export function icon(name, size = 18) {
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;
}

/** Crée un élément à partir d'un fragment HTML (déjà échappé). */
export function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
}

// ---------------------------------------------------------------- toasts
export function toast(message, type = 'success', ms = 4000) {
    let box = document.getElementById('toasts');
    if (!box) {
        box = el('<div id="toasts" class="toasts" role="status" aria-live="polite"></div>');
        document.body.appendChild(box);
    }
    const t = el(`<div class="toast toast-${type}">${icon(type === 'error' ? 'alert' : type === 'info' ? 'history' : 'check', 16)}<span>${esc(message)}</span></div>`);
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 250); }, ms);
}

// ---------------------------------------------------------------- dialogue
/** Dialogue modal. buttons : [{ label, value, kind: 'primary'|'danger'|'ghost' }]. Résout avec la valeur choisie (null si fermé). */
export function dialog({ title, body = '', bodyHtml = '', buttons }) {
    return new Promise(resolve => {
        const d = el(`<dialog class="dialog">
            <h2 class="dialog-title">${esc(title)}</h2>
            <div class="dialog-body">${bodyHtml || `<p>${esc(body)}</p>`}</div>
            <div class="dialog-actions">${buttons.map((b, i) => `<button type="button" class="btn btn-${b.kind || 'ghost'}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>
        </dialog>`);
        document.body.appendChild(d);
        const close = (value) => { d.close(); d.remove(); resolve(value); };
        d.addEventListener('cancel', (e) => { e.preventDefault(); close(null); });
        d.querySelectorAll('[data-i]').forEach(btn => btn.addEventListener('click', () => close(buttons[+btn.dataset.i].value)));
        d.showModal();
        d.querySelector('.btn-primary, .btn-danger, .btn')?.focus();
    });
}

export function confirmDelete(what) {
    return dialog({
        title: 'Confirmer la suppression',
        body: `« ${what} » sera supprimé du brouillon. Vous pourrez encore annuler tant que vous n'avez pas publié.`,
        buttons: [{ label: 'Annuler', value: false }, { label: 'Supprimer', value: true, kind: 'danger' }]
    }).then(Boolean);
}

// ---------------------------------------------------------------- panneau latéral
/** Ouvre un panneau d'édition à droite. Retourne { panel, close }. */
export function openPanel(title, bodyNode, { onSave, saveLabel = 'Enregistrer' } = {}) {
    document.querySelector('.panel-backdrop')?.remove();
    const wrap = el(`<div class="panel-backdrop">
        <aside class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
            <header class="panel-header"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button></header>
            <div class="panel-body"></div>
            <footer class="panel-footer"><button type="button" class="btn btn-ghost" data-close>Annuler</button><button type="button" class="btn btn-primary" data-save>${esc(saveLabel)}</button></footer>
        </aside></div>`);
    wrap.querySelector('.panel-body').appendChild(bodyNode);
    const close = () => { wrap.classList.add('leaving'); document.removeEventListener('keydown', onKey); setTimeout(() => wrap.remove(), 180); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    wrap.querySelector('[data-save]').addEventListener('click', async () => {
        if (!onSave || (await onSave()) !== false) close();
    });
    document.body.appendChild(wrap);
    setTimeout(() => wrap.querySelector('input, textarea, select')?.focus(), 50);
    return { panel: wrap, close };
}

export function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}
