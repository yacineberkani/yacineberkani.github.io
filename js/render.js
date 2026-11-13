/* =========================================================================
   Rendu du contenu (data/content.json) → HTML
   Fonctions pures, sans DOM : utilisées par le site public et testées avec
   node --test. Le HTML produit reprend EXACTEMENT les balises et classes
   d'origine pour que le design (css/style.css) reste identique.
   Règle de sécurité : tout texte venant du JSON passe par escapeHtml(),
   richText(), safeUrl() ou safeIcon().
   ========================================================================= */

export const SECTION_ORDER = ['about', 'skills', 'experience', 'projects', 'contact'];

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Mini-balisage sûr : **gras** → <strong>, ==surligné== → <span class="highlight">. */
export function richText(value) {
    return escapeHtml(value)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/==(.+?)==/g, '<span class="highlight">$1</span>');
}

/** N'autorise que http(s), mailto, ancres et chemins relatifs du site. */
export function safeUrl(value, { allowDataImage = false } = {}) {
    const url = String(value ?? '').trim();
    if (!url) return '';
    if (/^(https?:|mailto:)/i.test(url)) return url;
    if (/^(#|assets\/|\.\/assets\/|\/assets\/)/.test(url)) return url;
    if (allowDataImage && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
    return '#';
}

export function safeIcon(value) {
    const icon = String(value ?? '').trim();
    return /^(fas|fab|far) fa-[a-z0-9-]+$/.test(icon) ? icon : 'fas fa-circle';
}

const attr = escapeHtml;
const icon = (cls) => `<i class="${safeIcon(cls)}"></i>`;
const list = (value) => (Array.isArray(value) ? value : []);

// ---------------------------------------------------------------- sections

export function isVisible(content, key) {
    return content?.sections?.[key]?.visible !== false;
}

/** « 02 — Compétences » : numérotation recalculée selon les sections visibles. */
export function sectionTag(content, key) {
    const visible = SECTION_ORDER.filter(k => isVisible(content, k));
    const n = visible.indexOf(key) + 1;
    const label = content?.sections?.[key]?.tag ?? '';
    return `${String(Math.max(n, 1)).padStart(2, '0')} — ${label}`;
}

// ---------------------------------------------------------------- liens

function contactLinks(content) {
    const email = content?.contact?.email;
    const links = list(content?.contact?.links).map(l => ({ ...l, external: true }));
    if (email) links.push({ label: 'Email', url: `mailto:${email}`, icon: 'fas fa-envelope', external: false });
    return links;
}

function socialLinks(content) {
    return contactLinks(content).map(l =>
        `<a href="${attr(safeUrl(l.url))}"${l.external ? ' target="_blank" rel="noopener"' : ''} aria-label="${attr(l.label)}">${icon(l.icon)}</a>`
    ).join('');
}

export const renderHeroSocial = socialLinks;
export const renderFooterSocial = socialLinks;

export function renderContactMethods(content) {
    const email = content?.contact?.email;
    const items = [];
    if (email) items.push({ label: 'Email', display: email, url: `mailto:${email}`, icon: 'fas fa-envelope', external: false });
    for (const l of list(content?.contact?.links)) items.push({ ...l, external: true });
    return items.map(m =>
        `<a href="${attr(safeUrl(m.url))}"${m.external ? ' target="_blank" rel="noopener"' : ''} class="contact-method">` +
        `<div class="method-icon">${icon(m.icon)}</div>` +
        `<div><span class="method-label">${escapeHtml(m.label)}</span><span class="method-value">${escapeHtml(m.display)}</span></div></a>`
    ).join('');
}

// ---------------------------------------------------------------- à propos

export function renderAboutParagraphs(content) {
    return list(content?.profile?.about?.paragraphs)
        .map(p => `<p class="about-paragraph">${richText(p)}</p>`).join('');
}

export function renderAboutFacts(content) {
    return list(content?.profile?.about?.facts).map(f =>
        `<div class="info-item">${icon(f.icon)}<div><span class="info-label">${escapeHtml(f.label)}</span><span class="info-value">${escapeHtml(f.value)}</span></div></div>`
    ).join('');
}

export function statValue(content, stat) {
    const v = stat?.source === 'years' ? content?.profile?.yearsOfExperience : stat?.value;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function renderStats(content) {
    return list(content?.stats).map(s =>
        `<div class="stat-card"><div class="stat-number" data-target="${statValue(content, s)}">0</div>` +
        `<div class="stat-plus">${escapeHtml(s.suffix)}</div><div class="stat-label">${escapeHtml(s.label)}</div></div>`
    ).join('');
}

// ---------------------------------------------------------------- compétences

export function renderSkillItem(item) {
    const level = item?.level ? ` <small>(${escapeHtml(item.level)})</small>` : '';
    return `<span class="skill-tag">${escapeHtml(item?.name)}${level}</span>`;
}

export function renderSkills(content) {
    return list(content?.skills?.categories).map((c, i) =>
        `<div class="skill-category" data-aos="fade-up" data-aos-delay="${(i + 1) * 100}">` +
        `<div class="skill-icon">${icon(c.icon)}</div><h3>${escapeHtml(c.name)}</h3>` +
        `<div class="skill-tags">${list(c.items).map(renderSkillItem).join('')}</div></div>`
    ).join('');
}

// ---------------------------------------------------------------- parcours

function period(start, end) {
    return [start, end].filter(Boolean).map(escapeHtml).join(' — ');
}

export function renderTimeline(content) {
    return list(content?.experiences).map(e => {
        const results = list(e.results);
        const techs = list(e.technologies);
        return `<div class="timeline-item" data-aos="fade-up"><div class="timeline-dot"></div><div class="timeline-content">` +
            `<div class="timeline-date">${period(e.start, e.end || 'Aujourd\'hui')}</div>` +
            `<h3 class="timeline-title">${escapeHtml(e.role)}</h3>` +
            `<h4 class="timeline-company">${escapeHtml(e.company)}</h4>` +
            `<p class="timeline-description">${richText(e.description)}</p>` +
            (results.length ? `<div class="timeline-results">${results.map(r =>
                `<span class="result-chip">${icon(r.icon)} ${escapeHtml(r.label)}</span>`).join('')}</div>` : '') +
            (techs.length ? `<div class="project-tags">${techs.map(t =>
                `<span class="project-tag">${escapeHtml(t)}</span>`).join('')}</div>` : '') +
            `</div></div>`;
    }).join('');
}

export function renderEducation(content) {
    return list(content?.education).map((e, i) =>
        `<div class="education-card" data-aos="fade-up" data-aos-delay="${(i + 1) * 100}">` +
        `<div class="education-year">${escapeHtml(e.year)}</div><h4>${escapeHtml(e.degree)}</h4><p>${escapeHtml(e.school)}</p></div>`
    ).join('');
}

export function renderCertifications(content) {
    return list(content?.certifications).map((c, i) => {
        const url = safeUrl(c.url);
        const meta = [c.issuer, c.date].filter(Boolean).map(escapeHtml).join(' · ');
        const inner = `<div class="cert-icon">${icon(c.icon)}</div><h4>${escapeHtml(c.title)}</h4><p>${meta}</p>`;
        const aos = `data-aos="fade-up" data-aos-delay="${(i + 1) * 100}"`;
        return url && url !== '#'
            ? `<a href="${attr(url)}" target="_blank" rel="noopener" class="education-card cert-card" ${aos}>${inner}` +
              `<span class="cert-link">Vérifier le certificat <i class="fas fa-arrow-up-right-from-square"></i></span></a>`
            : `<div class="education-card cert-card" ${aos}>${inner}</div>`;
    }).join('');
}

// ---------------------------------------------------------------- projets

export function renderProjectFilters(content) {
    return `<button class="filter-btn active" data-filter="all">Tous</button>` +
        list(content?.projects?.categories).map(c =>
            `<button class="filter-btn" data-filter="${attr(c.id)}">${escapeHtml(c.label)}</button>`).join('');
}

/** Les projets « mis en avant » passent en tête, l'ordre défini dans l'admin est conservé. */
export function orderProjects(items) {
    const all = list(items);
    return [...all.filter(p => p.featured), ...all.filter(p => !p.featured)];
}

export function renderProjectCard(project, idx, { allowDataImage = false } = {}) {
    const p = project || {};
    const links = p.links || {};
    const video = safeUrl(p.videoUrl);
    const image = safeUrl(p.image, { allowDataImage });
    let media = '';
    if (video && video !== '#') {
        media = `<div class="project-video-wrapper"><video controls preload="metadata" muted playsinline><source src="${attr(video)}" type="video/mp4"></video></div>`;
    } else if (image && image !== '#') {
        media = `<div class="project-video-wrapper project-image-wrapper"><img src="${attr(image)}" alt="${attr(p.title)}" loading="lazy"></div>`;
    }
    const github = safeUrl(links.github);
    const extra = [['demo', 'Démo', 'fas fa-play'], ['docs', 'Docs', 'fas fa-book']]
        .map(([key, label, ic]) => {
            const u = safeUrl(links[key]);
            return u && u !== '#' ? `<a href="${attr(u)}" target="_blank" rel="noopener" class="project-link"><span>${label}</span><i class="${ic}"></i></a>` : '';
        }).join('');
    const main = github && github !== '#'
        ? `<a href="${attr(github)}" target="_blank" rel="noopener" class="project-link"><span>Voir le code</span><i class="fab fa-github"></i></a>`
        : `<span class="project-poc-badge"><i class="fas fa-lock"></i> POC Interne</span>`;

    return `<article class="project-card" data-category="${attr(p.category)}" style="animation-delay: ${idx * 0.08}s">` +
        media +
        `<div class="project-icon">${icon(p.icon)}</div>` +
        `<div class="project-header"><h3 class="project-title">${escapeHtml(p.title)}</h3>` +
        `<span class="project-category">${escapeHtml(p.categoryLabel)}</span></div>` +
        `<p class="project-description">${escapeHtml(p.description)}</p>` +
        `<div class="project-tags">${list(p.tags).map(t => `<span class="project-tag">${escapeHtml(t)}</span>`).join('')}</div>` +
        `<div class="project-footer"><span class="project-date"><i class="far fa-calendar"></i> ${escapeHtml(p.date)}</span>` +
        main + extra + `</div></article>`;
}
