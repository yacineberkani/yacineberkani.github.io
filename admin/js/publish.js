/* =========================================================================
   Publication : prépare les fichiers à envoyer (content.json, nouvelles
   images, <title>/<meta> de index.html) puis crée UN commit sur GitHub.
   ========================================================================= */
import { CONTENT_PATH } from './config.js';
import { slugify, shortHash, dataUrlToBase64 } from './images.js';
import { escapeHtml } from '../../js/render.js';

const isDataImage = (v) => typeof v === 'string' && v.startsWith('data:image/');

/**
 * Remplace les images en data URL par des chemins de fichiers.
 * Retourne { content, images: [{ path, base64 }] } — `draft` n'est pas modifié.
 */
export async function extractImages(draft) {
    const content = structuredClone(draft);
    const images = [];
    const store = async (dataUrl, folder, name) => {
        const base64 = dataUrlToBase64(dataUrl);
        const path = `assets/images/${folder}/${slugify(name)}-${await shortHash(base64)}.webp`;
        if (!images.some(i => i.path === path)) images.push({ path, base64 });
        return path;
    };
    if (isDataImage(content.profile?.photo?.src)) {
        content.profile.photo.src = await store(content.profile.photo.src, 'profile', `${content.profile.firstName}-${content.profile.lastName}`);
    }
    for (const p of content.projects?.items || []) {
        if (isDataImage(p.image)) p.image = await store(p.image, 'projects', p.id || p.title);
    }
    return { content, images };
}

/** Met à jour <title> et <meta name="description"> de index.html (SEO sans JavaScript). */
export function updateIndexMeta(html, meta) {
    return html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.siteTitle)}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(meta.description)}">`);
}

/** Ensemble des fichiers d'images référencés par le contenu. */
export function referencedImages(content) {
    const refs = new Set();
    if (content?.profile?.photo?.src) refs.add(content.profile.photo.src);
    for (const p of content?.projects?.items || []) if (p.image) refs.add(p.image);
    return refs;
}

/**
 * Publie le brouillon. `gh` = module github.js (injecté pour les tests).
 * Retourne { sha, content }.
 */
export async function publish({ gh, draft, baseSha, pendingDeletes = [], summary = [] }) {
    const { content, images } = await extractImages(draft);
    content.updatedAt = new Date().toISOString();

    const files = [{ path: CONTENT_PATH, text: JSON.stringify(content, null, 2) + '\n' }];
    for (const img of images) files.push({ path: img.path, base64: img.base64 });

    const index = await gh.readText('index.html', baseSha);
    const newIndex = updateIndexMeta(index, content.meta);
    if (newIndex !== index) files.push({ path: 'index.html', text: newIndex });

    // On ne supprime jamais une image encore utilisée.
    const used = referencedImages(content);
    const deletes = pendingDeletes.filter(p => !used.has(p));

    const message = `admin: mise à jour du portfolio${summary.length ? ` (${summary.join(', ')})` : ''}`;
    const sha = await gh.commitChanges({ baseSha, message, files, deletes });
    return { sha, content };
}

/** Attend que GitHub Pages serve la nouvelle version (compare updatedAt). */
export async function waitForDeployment(updatedAt, { siteUrl, intervalMs = 10000, timeoutMs = 5 * 60000, onTick } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`${siteUrl}${CONTENT_PATH}?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok && (await res.json()).updatedAt === updatedAt) return true;
        } catch { /* réseau : on réessaie */ }
        onTick?.(Math.round((Date.now() - start) / 1000));
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}
