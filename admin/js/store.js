/* =========================================================================
   État de l'admin : version publiée, brouillon, suppressions en attente.
   Le brouillon est sauvegardé dans localStorage (contenu uniquement, il ne
   contient rien qui ne soit destiné à être public, et jamais le token).
   ========================================================================= */
import { DRAFT_KEY } from './config.js';

const LABELS = {
    meta: 'Référencement', profile: 'Profil', contact: 'Contact', stats: 'Statistiques',
    skills: 'Compétences', experience: 'Expériences', experiences: 'Expériences', education: 'Formations',
    certifications: 'Certifications', projects: 'Projets', sections: 'Sections'
};

export const state = {
    published: null,   // contenu en ligne (au commit baseSha)
    baseSha: null,     // commit sur lequel le brouillon est basé
    draft: null,       // contenu en cours d'édition
    pendingDeletes: [],// images à supprimer à la prochaine publication
    storageWarning: false
};

const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => fn());

export const clone = (v) => structuredClone(v);

/** Initialise depuis GitHub ; reprend un brouillon local s'il en existe un. Retourne true si repris. */
export function init(published, baseSha) {
    state.published = published;
    state.baseSha = baseSha;
    state.pendingDeletes = [];
    let restored = false;
    try {
        const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
        if (saved?.content && JSON.stringify(saved.content) !== JSON.stringify(published)) {
            state.draft = saved.content;
            state.pendingDeletes = Array.isArray(saved.pendingDeletes) ? saved.pendingDeletes : [];
            restored = true;
        }
    } catch { /* brouillon illisible : ignoré */ }
    if (!restored) state.draft = clone(published);
    persist();
    emit();
    return restored;
}

function persist() {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ content: state.draft, pendingDeletes: state.pendingDeletes, savedAt: new Date().toISOString() }));
        state.storageWarning = false;
    } catch {
        // Quota dépassé (images très lourdes) : l'édition continue en mémoire.
        state.storageWarning = true;
    }
}

/** Applique une modification au brouillon : update(draftCopy) peut muter la copie. */
export function update(mutator) {
    const next = clone(state.draft);
    mutator(next);
    state.draft = next;
    persist();
    emit();
}

export function replaceDraft(content) {
    state.draft = clone(content);
    persist();
    emit();
}

export function toggleDelete(path) {
    const i = state.pendingDeletes.indexOf(path);
    if (i >= 0) state.pendingDeletes.splice(i, 1); else state.pendingDeletes.push(path);
    persist();
    emit();
}

export function discardDraft() {
    state.draft = clone(state.published);
    state.pendingDeletes = [];
    persist();
    emit();
}

/** Après une publication réussie. */
export function markPublished(content, newSha) {
    state.published = clone(content);
    state.baseSha = newSha;
    state.draft = clone(content);
    state.pendingDeletes = [];
    persist();
    emit();
}

/** Liste lisible des parties modifiées, ex. ['Profil', 'Projets']. */
export function changedSections() {
    if (!state.draft || !state.published) return [];
    const keys = new Set([...Object.keys(state.draft), ...Object.keys(state.published)]);
    const out = new Set();
    for (const k of keys) {
        if (k === 'updatedAt') continue;
        if (JSON.stringify(state.draft[k]) !== JSON.stringify(state.published[k])) out.add(LABELS[k] || k);
    }
    if (state.pendingDeletes.length) out.add('Médias');
    return [...out];
}

export const isDirty = () => changedSections().length > 0;

export function clearLocalDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* rien */ }
}

// Accès par chemin : 'projects.items' → state.draft.projects.items
export function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = value;
}
