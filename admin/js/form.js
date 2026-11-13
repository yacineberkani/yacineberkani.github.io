/* =========================================================================
   Formulaires déclaratifs : une liste de champs décrit le formulaire.
   Types : text, email, url, textarea, number, select, checkbox, tags,
           icon, image, repeater (liste de sous-objets).
   La validation réelle est faite par schema.js ; ici on affiche les erreurs.
   ========================================================================= */
import { esc, icon, el, toast } from './ui.js';
import { processImage } from './images.js';
import { getPath, setPath } from './store.js';

const ICON_SUGGESTIONS = ['fas fa-brain', 'fas fa-robot', 'fas fa-cloud', 'fas fa-code', 'fas fa-database', 'fas fa-cogs',
    'fas fa-rocket', 'fas fa-bolt', 'fas fa-bullseye', 'fas fa-check-circle', 'fas fa-chart-line', 'fas fa-terminal',
    'fas fa-plug', 'fas fa-puzzle-piece', 'fas fa-certificate', 'fas fa-award', 'fas fa-graduation-cap', 'fas fa-language',
    'fas fa-map-marker-alt', 'fas fa-envelope', 'fab fa-github', 'fab fa-linkedin-in', 'fab fa-x-twitter', 'fab fa-medium',
    'fab fa-kaggle', 'fab fa-python', 'fab fa-docker', 'fab fa-aws', 'fab fa-google'];

let uid = 0;

/** Chemin d'affichage d'une image (l'admin est servi depuis /admin/). */
export function imageSrc(value) {
    if (!value) return '';
    if (value.startsWith('data:image/')) return value;
    if (value.startsWith('assets/')) return '../' + value;
    return '';
}

function inputHtml(f, value, id) {
    const req = f.required ? ' required' : '';
    const max = f.max ? ` maxlength="${f.max}"` : '';
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    switch (f.type) {
        case 'paragraphs':
            return `<textarea id="${id}" data-input rows="${f.rows || 10}">${esc((value || []).join('\n\n'))}</textarea>`;
        case 'textarea':
            return `<textarea id="${id}" data-input rows="${f.rows || 4}"${max}${req}${ph}>${esc(value ?? '')}</textarea>`;
        case 'number':
            return `<input id="${id}" data-input type="number" min="${f.min ?? 0}" step="1" value="${esc(value ?? '')}"${req}>`;
        case 'select':
            return `<select id="${id}" data-input${req}>${(typeof f.options === 'function' ? f.options() : f.options)
                .map(o => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
        case 'checkbox':
            return `<label class="switch"><input id="${id}" data-input type="checkbox"${value ? ' checked' : ''}><span class="switch-track"></span><span>${esc(f.checkboxLabel || 'Oui')}</span></label>`;
        case 'tags':
            return `<input id="${id}" data-input type="text" value="${esc((value || []).join(', '))}" placeholder="Python, GCP, Docker"><div class="tag-preview"></div>`;
        case 'icon':
            return `<input id="${id}" data-input type="text" list="icon-list" value="${esc(value ?? '')}" placeholder="fas fa-rocket" spellcheck="false" autocomplete="off">`;
        case 'image':
            return `<div class="image-field" data-value="${esc(value ?? '')}">
                <div class="image-preview">${imageSrc(value) ? `<img src="${esc(imageSrc(value))}" alt="">` : `<span>${icon('image', 28)}</span>`}</div>
                <div class="image-actions">
                    <label class="btn btn-ghost btn-sm">${icon('upload', 16)}<span>${value ? 'Remplacer' : 'Importer'}</span><input id="${id}" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
                    ${f.removable ? `<button type="button" class="btn btn-ghost btn-sm" data-remove-image>${icon('trash', 16)}<span>Retirer</span></button>` : ''}
                    <p class="hint">JPEG, PNG ou WebP · converti en WebP (${f.maxSize || 1600} px max)</p>
                </div></div>`;
        default:
            return `<input id="${id}" data-input type="${f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}" value="${esc(value ?? '')}"${max}${req}${ph}${f.type === 'url' ? ' spellcheck="false"' : ''}>`;
    }
}

function repeaterRow(f, item) {
    return `<div class="rep-row">
        <div class="rep-fields">${f.fields.map(sf => {
            const id = `f${++uid}`;
            return `<div class="field field-inline" data-sub="${sf.key}" data-type="${sf.type || 'text'}">
                <label for="${id}">${esc(sf.label)}</label>${inputHtml(sf, getPath(item, sf.key), id)}</div>`;
        }).join('')}</div>
        <div class="rep-actions">
            <button type="button" class="icon-btn" data-rep="up" aria-label="Monter">${icon('up', 16)}</button>
            <button type="button" class="icon-btn" data-rep="down" aria-label="Descendre">${icon('down', 16)}</button>
            <button type="button" class="icon-btn danger" data-rep="remove" aria-label="Retirer">${icon('trash', 16)}</button>
        </div></div>`;
}

function fieldHtml(f, value) {
    const id = `f${++uid}`;
    const label = `<label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>`;
    const help = f.help ? `<p class="hint">${esc(f.help)}</p>` : '';
    const rich = f.rich ? `<p class="hint">Mise en forme : <code>**gras**</code> · <code>==surligné==</code></p>` : '';
    if (f.type === 'repeater') {
        return `<div class="field field-full" data-key="${f.key}" data-type="repeater">
            <div class="field-head">${label}<button type="button" class="btn btn-ghost btn-sm" data-rep="add">${icon('plus', 16)}<span>${esc(f.addLabel || 'Ajouter')}</span></button></div>
            ${help}<div class="rep-list">${(value || []).map(item => repeaterRow(f, item)).join('')}</div>
            <p class="error" hidden></p></div>`;
    }
    const full = ['textarea', 'paragraphs', 'tags', 'image'].includes(f.type) || f.full ? ' field-full' : '';
    return `<div class="field${full}" data-key="${f.key}" data-type="${f.type || 'text'}">${label}${inputHtml(f, value, id)}${rich}${help}<p class="error" hidden></p></div>`;
}

function updateTagPreview(input) {
    const box = input.parentElement.querySelector('.tag-preview');
    if (box) box.innerHTML = splitTags(input.value).map(t => `<span class="chip">${esc(t)}</span>`).join('');
}
const splitTags = (v) => String(v).split(',').map(s => s.trim()).filter(Boolean);

function wireImage(fieldEl, f) {
    const box = fieldEl.querySelector('.image-field');
    const file = box.querySelector('input[type=file]');
    file.addEventListener('change', async () => {
        const chosen = file.files[0];
        file.value = '';
        if (!chosen) return;
        box.classList.add('loading');
        try {
            const dataUrl = await processImage(chosen, f.maxSize || 1600);
            box.dataset.value = dataUrl;
            box.querySelector('.image-preview').innerHTML = `<img src="${esc(dataUrl)}" alt="">`;
            box.querySelector('label span').textContent = 'Remplacer';
            const kb = Math.round(dataUrl.length * 0.75 / 1024);
            toast(`Image prête (${kb} Ko). Elle sera envoyée à la publication.`, 'info');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            box.classList.remove('loading');
        }
    });
    box.querySelector('[data-remove-image]')?.addEventListener('click', () => {
        box.dataset.value = '';
        box.querySelector('.image-preview').innerHTML = `<span>${icon('image', 28)}</span>`;
    });
}

function wireRepeater(fieldEl, f) {
    const listEl = fieldEl.querySelector('.rep-list');
    fieldEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-rep]');
        if (!btn || !fieldEl.contains(btn)) return;
        const row = btn.closest('.rep-row');
        const action = btn.dataset.rep;
        if (action === 'add') {
            listEl.appendChild(el(repeaterRow(f, {})));
            listEl.lastElementChild.querySelector('input, select, textarea')?.focus();
        } else if (action === 'remove') row.remove();
        else if (action === 'up' && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
        else if (action === 'down' && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    });
}

/** Construit le formulaire (élément <form>) pour `value`. */
export function renderForm(fields, value = {}) {
    const form = el(`<form class="form-grid" novalidate>${fields.map(f => fieldHtml(f, getPath(value, f.key))).join('')}</form>`);
    if (!document.getElementById('icon-list')) {
        document.body.appendChild(el(`<datalist id="icon-list">${ICON_SUGGESTIONS.map(i => `<option value="${i}"></option>`).join('')}</datalist>`));
    }
    form.addEventListener('submit', (e) => e.preventDefault());
    for (const f of fields) {
        const fieldEl = form.querySelector(`[data-key="${f.key}"]`);
        if (f.type === 'image') wireImage(fieldEl, f);
        if (f.type === 'repeater') wireRepeater(fieldEl, f);
        if (f.type === 'tags') {
            const input = fieldEl.querySelector('[data-input]');
            updateTagPreview(input);
            input.addEventListener('input', () => updateTagPreview(input));
        }
    }
    return form;
}

function readInput(container, type) {
    if (type === 'image') return container.querySelector('.image-field').dataset.value || '';
    const input = container.querySelector('[data-input]');
    if (type === 'checkbox') return input.checked;
    if (type === 'number') return input.value === '' ? null : Number(input.value);
    if (type === 'tags') return splitTags(input.value);
    if (type === 'paragraphs') return input.value.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    return input.value.trim();
}

/** Relit le formulaire et retourne une copie de `base` mise à jour. */
export function readForm(form, fields, base = {}) {
    const out = structuredClone(base);
    for (const f of fields) {
        const fieldEl = form.querySelector(`[data-key="${f.key}"]`);
        if (f.type === 'repeater') {
            const rows = [...fieldEl.querySelectorAll('.rep-row')].map(row => {
                const item = {};
                for (const sf of f.fields) {
                    const v = readInput(row.querySelector(`[data-sub="${sf.key}"]`), sf.type);
                    if (v !== '' || !sf.optional) setPath(item, sf.key, v);
                }
                return item;
            });
            setPath(out, f.key, rows);
        } else {
            setPath(out, f.key, readInput(fieldEl, f.type));
        }
    }
    return out;
}

/** Affiche les erreurs de schema.js dont le chemin commence par `prefix`. Retourne le nombre affiché. */
export function showErrors(form, errors, prefix = '') {
    form.querySelectorAll('.error').forEach(p => { p.hidden = true; p.textContent = ''; });
    form.querySelectorAll('.invalid').forEach(n => n.classList.remove('invalid'));
    let shown = 0;
    for (const e of errors) {
        if (prefix && !e.path.startsWith(prefix)) continue;
        const rel = prefix ? e.path.slice(prefix.length).replace(/^\./, '') : e.path;
        // ex. 'results[1].label' → champ 'results' (repeater) ; 'links.github' → champ 'links.github'
        const fields = [...form.querySelectorAll('[data-key]')];
        const field = fields.find(f => rel === f.dataset.key) ||
            fields.find(f => rel.startsWith(f.dataset.key + '[') || rel.startsWith(f.dataset.key + '.'));
        if (!field) continue;
        const p = field.querySelector(':scope > .error');
        const detail = rel === field.dataset.key ? '' : ` (${rel.slice(field.dataset.key.length).replace(/^\[(\d+)\]/, (m, n) => `ligne ${+n + 1}`).replace(/^\./, '')})`;
        p.textContent = (p.textContent ? p.textContent + ' ' : '') + e.message + detail;
        p.hidden = false;
        field.classList.add('invalid');
        shown++;
    }
    form.querySelector('.invalid')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return shown;
}
