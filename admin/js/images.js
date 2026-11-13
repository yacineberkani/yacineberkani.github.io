/* =========================================================================
   Images : contrôle du type réel (signature binaire), redimensionnement et
   conversion WebP dans le navigateur (le ré-encodage supprime aussi les
   métadonnées EXIF, dont la position GPS). SVG refusé (peut contenir du JS).
   ========================================================================= */

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;

/** 'jpeg' | 'png' | 'webp' | null d'après les premiers octets du fichier. */
export function detectImageType(bytes) {
    const b = bytes;
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
    if (b.length >= 8 && [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A].every((v, i) => b[i] === v)) return 'png';
    if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp';
    return null;
}

export function slugify(text) {
    return String(text || 'image')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'image';
}

export async function shortHash(base64) {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function dataUrlToBase64(dataUrl) {
    return String(dataUrl).split(',')[1] || '';
}

/** Contrôle + redimensionne + convertit en WebP. Retourne une data URL. */
export async function processImage(file, maxSize = 1600) {
    if (!file) throw new Error('Aucun fichier.');
    if (file.size > MAX_INPUT_BYTES) throw new Error('Image trop lourde (10 Mo maximum).');
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!detectImageType(head)) throw new Error('Format non accepté : utilisez JPEG, PNG ou WebP.');

    const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Image illisible ou corrompue.'); });
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL('image/webp', 0.82);
    if (!dataUrl.startsWith('data:image/webp')) throw new Error('Votre navigateur ne sait pas produire du WebP.');
    return dataUrl;
}
