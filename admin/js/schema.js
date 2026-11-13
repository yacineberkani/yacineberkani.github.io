/* =========================================================================
   Validation de data/content.json
   Utilisée par l'admin (formulaires + contrôle global avant publication)
   et par les tests (node --test). Retourne une liste d'erreurs
   { path, message } — liste vide = contenu valide.
   ========================================================================= */

export const AVAILABILITY = {
    open: 'Disponible pour de nouvelles opportunités',
    searching: 'En recherche active',
    freelance: 'Disponible pour des missions freelance',
    mission: 'En mission',
    unavailable: 'Indisponible'
};

export const SECTION_KEYS = ['about', 'skills', 'experience', 'projects', 'contact'];

const ICON_RE = /^(fas|fab|far) fa-[a-z0-9-]+$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTP_RE = /^https?:\/\/[^\s]+$/i;
const IMAGE_RE = /^(assets\/[\w./-]+\.(jpe?g|png|webp|gif)|data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+)$/i;

export function validateContent(content) {
    const errors = [];
    const err = (path, message) => errors.push({ path, message });
    const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

    const text = (obj, key, path, { required = true, max = 200 } = {}) => {
        const v = obj?.[key];
        const p = path ? `${path}.${key}` : key;
        if (v === undefined || v === null || v === '') {
            if (required) err(p, 'Champ obligatoire.');
            return;
        }
        if (typeof v !== 'string') return err(p, 'Doit être un texte.');
        if (required && !v.trim()) return err(p, 'Champ obligatoire.');
        if (v.length > max) err(p, `${max} caractères maximum.`);
    };
    const url = (obj, key, path, { required = false } = {}) => {
        const v = obj?.[key];
        const p = `${path}.${key}`;
        if (!v) { if (required) err(p, 'Lien obligatoire.'); return; }
        if (typeof v !== 'string' || !HTTP_RE.test(v)) err(p, 'Lien invalide : il doit commencer par https://');
    };
    const iconField = (obj, key, path) => {
        const v = obj?.[key];
        if (typeof v !== 'string' || !ICON_RE.test(v)) err(`${path}.${key}`, 'Icône invalide (ex. « fas fa-rocket »).');
    };
    const array = (value, path, { min = 0 } = {}) => {
        if (!Array.isArray(value)) { err(path, 'Liste attendue.'); return []; }
        if (value.length < min) err(path, `Au moins ${min} élément(s).`);
        return value;
    };
    const ids = (items, path) => {
        const seen = new Set();
        items.forEach((it, i) => {
            const id = it?.id;
            if (typeof id !== 'string' || !ID_RE.test(id)) err(`${path}[${i}].id`, 'Identifiant invalide (minuscules, chiffres, tirets).');
            else if (seen.has(id)) err(`${path}[${i}].id`, 'Identifiant déjà utilisé.');
            seen.add(id);
        });
    };
    const strings = (value, path, max = 80) => {
        array(value, path).forEach((s, i) => {
            if (typeof s !== 'string' || !s.trim()) err(`${path}[${i}]`, 'Texte vide.');
            else if (s.length > max) err(`${path}[${i}]`, `${max} caractères maximum.`);
        });
    };

    if (!isObj(content)) return [{ path: '', message: 'Le contenu doit être un objet JSON.' }];
    if (content.schemaVersion !== 1) err('schemaVersion', 'Version de schéma non prise en charge.');

    // --- meta
    const meta = content.meta;
    if (!isObj(meta)) err('meta', 'Section manquante.');
    text(meta, 'siteTitle', 'meta', { max: 120 });
    text(meta, 'description', 'meta', { max: 300 });
    text(meta, 'footerTagline', 'meta', { required: false, max: 200 });

    // --- profil
    const pr = content.profile;
    if (!isObj(pr)) err('profile', 'Section manquante.');
    text(pr, 'firstName', 'profile', { max: 60 });
    text(pr, 'lastName', 'profile', { max: 60 });
    text(pr, 'title', 'profile', { max: 80 });
    if (!isObj(pr?.photo) || typeof pr.photo.src !== 'string' || !IMAGE_RE.test(pr.photo.src)) err('profile.photo.src', 'Photo de profil invalide.');
    text(pr?.photo, 'alt', 'profile.photo', { max: 160 });
    if (!Object.hasOwn(AVAILABILITY, pr?.availability?.status)) err('profile.availability.status', 'Statut de disponibilité inconnu.');
    text(pr?.availability, 'label', 'profile.availability', { max: 120 });
    if (!Number.isInteger(pr?.yearsOfExperience) || pr.yearsOfExperience < 0 || pr.yearsOfExperience > 60) err('profile.yearsOfExperience', 'Nombre entier entre 0 et 60.');
    strings(pr?.typedPhrases, 'profile.typedPhrases', 60);
    if (Array.isArray(pr?.typedPhrases) && !pr.typedPhrases.length) err('profile.typedPhrases', 'Au moins une phrase.');
    text(pr, 'heroDescription', 'profile', { max: 1000 });
    array(pr?.heroBadges, 'profile.heroBadges').forEach((b, i) => {
        iconField(b, 'icon', `profile.heroBadges[${i}]`);
        text(b, 'label', `profile.heroBadges[${i}]`, { max: 20 });
    });
    if (Array.isArray(pr?.heroBadges) && pr.heroBadges.length !== 4) err('profile.heroBadges', 'Exactement 4 badges (positions fixes autour de la photo).');
    text(pr?.about, 'subtitle', 'profile.about', { max: 160 });
    strings(pr?.about?.paragraphs, 'profile.about.paragraphs', 1500);
    array(pr?.about?.facts, 'profile.about.facts').forEach((f, i) => {
        const p = `profile.about.facts[${i}]`;
        iconField(f, 'icon', p);
        text(f, 'label', p, { max: 40 });
        text(f, 'value', p, { max: 120 });
    });

    // --- contact
    const ct = content.contact;
    text(ct, 'subtitle', 'contact', { max: 160 });
    text(ct, 'heading', 'contact', { max: 120 });
    text(ct, 'text', 'contact', { max: 800 });
    if (typeof ct?.email !== 'string' || !EMAIL_RE.test(ct.email)) err('contact.email', 'Adresse email invalide.');
    const links = array(ct?.links, 'contact.links');
    ids(links, 'contact.links');
    links.forEach((l, i) => {
        const p = `contact.links[${i}]`;
        text(l, 'label', p, { max: 40 });
        text(l, 'display', p, { max: 80 });
        url(l, 'url', p, { required: true });
        iconField(l, 'icon', p);
    });

    // --- statistiques
    const stats = array(content.stats, 'stats');
    ids(stats, 'stats');
    stats.forEach((s, i) => {
        const p = `stats[${i}]`;
        if (s?.source !== 'years' && (!Number.isInteger(s?.value) || s.value < 0 || s.value > 1000000)) err(`${p}.value`, 'Nombre entier positif attendu.');
        text(s, 'suffix', p, { required: false, max: 5 });
        text(s, 'label', p, { max: 60 });
    });

    // --- compétences
    text(content.skills, 'subtitle', 'skills', { max: 160 });
    const cats = array(content.skills?.categories, 'skills.categories');
    ids(cats, 'skills.categories');
    cats.forEach((c, i) => {
        const p = `skills.categories[${i}]`;
        text(c, 'name', p, { max: 60 });
        iconField(c, 'icon', p);
        array(c?.items, `${p}.items`).forEach((it, j) => {
            text(it, 'name', `${p}.items[${j}]`, { max: 40 });
            text(it, 'level', `${p}.items[${j}]`, { required: false, max: 20 });
        });
    });

    // --- expériences
    text(content.experience, 'subtitle', 'experience', { max: 160 });
    const exps = array(content.experiences, 'experiences');
    ids(exps, 'experiences');
    exps.forEach((e, i) => {
        const p = `experiences[${i}]`;
        text(e, 'role', p, { max: 80 });
        text(e, 'company', p, { max: 80 });
        text(e, 'start', p, { max: 30 });
        text(e, 'end', p, { required: false, max: 30 });
        text(e, 'description', p, { max: 2000 });
        array(e?.results, `${p}.results`).forEach((r, j) => {
            iconField(r, 'icon', `${p}.results[${j}]`);
            text(r, 'label', `${p}.results[${j}]`, { max: 60 });
        });
        strings(e?.technologies, `${p}.technologies`, 40);
    });

    // --- formations / certifications
    const edu = array(content.education, 'education');
    ids(edu, 'education');
    edu.forEach((e, i) => {
        const p = `education[${i}]`;
        text(e, 'degree', p, { max: 120 });
        text(e, 'school', p, { max: 120 });
        text(e, 'year', p, { max: 20 });
    });
    const certs = array(content.certifications, 'certifications');
    ids(certs, 'certifications');
    certs.forEach((c, i) => {
        const p = `certifications[${i}]`;
        text(c, 'title', p, { max: 120 });
        text(c, 'issuer', p, { max: 80 });
        text(c, 'date', p, { required: false, max: 30 });
        url(c, 'url', p);
        iconField(c, 'icon', p);
    });

    // --- projets
    text(content.projects, 'subtitle', 'projects', { max: 160 });
    const pcats = array(content.projects?.categories, 'projects.categories');
    ids(pcats, 'projects.categories');
    pcats.forEach((c, i) => text(c, 'label', `projects.categories[${i}]`, { max: 40 }));
    const catIds = new Set(pcats.map(c => c?.id));
    const projects = array(content.projects?.items, 'projects.items');
    ids(projects, 'projects.items');
    projects.forEach((pj, i) => {
        const p = `projects.items[${i}]`;
        text(pj, 'title', p, { max: 100 });
        text(pj, 'description', p, { max: 1000 });
        if (!catIds.has(pj?.category)) err(`${p}.category`, 'Catégorie inconnue.');
        text(pj, 'categoryLabel', p, { max: 40 });
        iconField(pj, 'icon', p);
        strings(pj?.tags, `${p}.tags`, 40);
        text(pj, 'date', p, { required: false, max: 30 });
        if (pj?.image && (typeof pj.image !== 'string' || !IMAGE_RE.test(pj.image))) err(`${p}.image`, 'Image invalide.');
        url(pj, 'videoUrl', p);
        for (const k of ['github', 'demo', 'docs']) url(pj?.links, k, `${p}.links`);
        if (typeof pj?.featured !== 'boolean') err(`${p}.featured`, 'Vrai ou faux attendu.');
    });

    // --- sections
    for (const k of SECTION_KEYS) {
        const s = content.sections?.[k];
        const p = `sections.${k}`;
        if (!isObj(s)) { err(p, 'Section manquante.'); continue; }
        if (typeof s.visible !== 'boolean') err(`${p}.visible`, 'Vrai ou faux attendu.');
        text(s, 'tag', p, { max: 40 });
        text(s, 'title', p, { max: 80 });
    }

    return errors;
}
