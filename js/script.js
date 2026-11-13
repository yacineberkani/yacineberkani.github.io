/* =========================================================================
   Portfolio - Yacine Berkani | ML Engineer
   JavaScript principal : chargement du contenu (data/content.json),
   rendu, puis animations, navigation, thème, projets, formulaire.
   Le contenu se modifie depuis le back-office (/admin/), pas ici.
   ========================================================================= */

import * as R from './render.js';

// Clé du brouillon écrit par l'admin (même origine) — lu seulement en mode aperçu.
const DRAFT_KEY = 'portfolio-admin-draft';
const isPreview = new URLSearchParams(location.search).has('preview');

const $ = (sel) => document.querySelector(sel);
const pageLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));

// =====================================================================
// 1. THEME TOGGLE (dark / light) — immédiat, avant le chargement du contenu
// =====================================================================
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const savedTheme = localStorage.getItem('portfolio-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function setTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);
    const icon = themeToggle && themeToggle.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}
setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        setTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
}

// =====================================================================
// 2. CHARGEMENT ET RENDU DU CONTENU
// =====================================================================
async function loadContent() {
    if (isPreview) {
        try {
            const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
            if (draft && draft.content) return draft.content;
        } catch { /* brouillon illisible : on affiche la version publiée */ }
    }
    // no-cache : revalide auprès de GitHub Pages pour toujours voir la dernière publication.
    const res = await fetch('data/content.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

function setText(sel, value) {
    const el = $(sel);
    if (el) el.textContent = value ?? '';
}
function setHtml(sel, html) {
    const el = $(sel);
    if (el) el.innerHTML = html;
}

function applyContent(c) {
    const fullName = `${c.profile.firstName} ${c.profile.lastName}`;

    // <head>
    if (c.meta?.siteTitle) document.title = c.meta.siteTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && c.meta?.description) metaDesc.setAttribute('content', c.meta.description);

    // Hero
    setText('#heroAvailability', c.profile.availability?.label);
    setText('#heroName', fullName);
    setHtml('#heroDescription', R.richText(c.profile.heroDescription));
    setHtml('#heroSocial', R.renderHeroSocial(c));
    const photo = $('#profilePhoto');
    if (photo) {
        photo.src = R.safeUrl(c.profile.photo?.src, { allowDataImage: isPreview });
        photo.alt = c.profile.photo?.alt || fullName;
    }
    document.querySelectorAll('.profile-badge').forEach((badge, i) => {
        const b = (c.profile.heroBadges || [])[i];
        badge.style.display = b ? '' : 'none';
        if (!b) return;
        badge.querySelector('i').className = R.safeIcon(b.icon);
        badge.querySelector('span').textContent = b.label;
    });

    // En-têtes de section + visibilité (section, menu, footer, boutons du hero)
    const subtitles = {
        about: c.profile.about?.subtitle, skills: c.skills?.subtitle, experience: c.experience?.subtitle,
        projects: c.projects?.subtitle, contact: c.contact?.subtitle
    };
    for (const key of R.SECTION_ORDER) {
        const section = document.getElementById(key);
        if (!section) continue;
        const visible = R.isVisible(c, key);
        section.style.display = visible ? '' : 'none';
        document.querySelectorAll(`.nav-menu a[href="#${key}"], .footer-links a[href="#${key}"]`)
            .forEach(a => { a.closest('li').style.display = visible ? '' : 'none'; });
        document.querySelectorAll(`.hero-buttons a[href="#${key}"]`)
            .forEach(a => { a.style.display = visible ? '' : 'none'; });
        const header = section.querySelector('.section-header');
        header.querySelector('.section-tag').textContent = R.sectionTag(c, key);
        header.querySelector('.section-title').textContent = c.sections[key].title;
        header.querySelector('.section-subtitle').textContent = subtitles[key] ?? '';
    }

    // À propos
    const aboutText = $('#aboutText');
    if (aboutText) {
        aboutText.querySelectorAll('.about-paragraph').forEach(p => p.remove());
        aboutText.insertAdjacentHTML('afterbegin', R.renderAboutParagraphs(c));
    }
    setHtml('#aboutInfo', R.renderAboutFacts(c));
    setHtml('#aboutStats', R.renderStats(c));

    // Compétences, parcours, formations, certifications
    setHtml('#skillsGrid', R.renderSkills(c));
    setHtml('#timeline', R.renderTimeline(c));
    setHtml('#educationGrid', R.renderEducation(c));
    setHtml('#certGrid', R.renderCertifications(c));
    for (const [header, grid, items] of [['#educationHeader', '#educationGrid', c.education], ['#certHeader', '#certGrid', c.certifications]]) {
        const show = Array.isArray(items) && items.length > 0;
        $(header).style.display = show ? '' : 'none';
        $(grid).style.display = show ? '' : 'none';
    }

    // Projets (filtres ; les cartes sont rendues par renderProjects)
    setHtml('#projectFilters', R.renderProjectFilters(c));

    // Contact + footer
    setText('#contactHeading', c.contact.heading);
    setText('#contactText', c.contact.text);
    setHtml('#contactMethods', R.renderContactMethods(c));
    setText('#footerTagline', c.meta?.footerTagline);
    setHtml('#footerSocial', R.renderFooterSocial(c));
    setText('#footerName', fullName);
}

function showPreviewBadge() {
    const badge = document.createElement('div');
    badge.textContent = 'Aperçu — brouillon non publié';
    Object.assign(badge.style, {
        position: 'fixed', left: '50%', bottom: '16px', transform: 'translateX(-50%)', zIndex: '10000',
        padding: '8px 14px', borderRadius: '999px', background: '#111827', color: '#fff',
        font: '600 13px/1.2 Inter, system-ui, sans-serif', boxShadow: '0 6px 24px rgba(0,0,0,.25)', pointerEvents: 'none'
    });
    document.body.appendChild(badge);
}

let content = null;
try {
    content = await loadContent();
    applyContent(content);
    if (isPreview) showPreviewBadge();
} catch (err) {
    console.error('Contenu indisponible :', err);
    setText('#heroDescription', 'Le contenu est momentanément indisponible. Merci de réessayer dans quelques instants.');
}

// =====================================================================
// 3. PRELOADER (masqué une fois la page ET le contenu prêts)
// =====================================================================
pageLoaded.then(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('hidden');
            document.body.classList.add('is-loaded'); // lance l'animation du logo
            setTimeout(() => preloader.remove(), 600);
        }, 500);
    } else {
        document.body.classList.add('is-loaded');
    }
});

// =====================================================================
// 4. AOS INIT (animations au scroll) — après le rendu
// =====================================================================
if (window.AOS) {
    AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 100, disable: false });
}

// =====================================================================
// 5. NAVIGATION MOBILE
// =====================================================================
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// =====================================================================
// 6. NAVBAR SCROLL EFFECT + LIEN ACTIF
// =====================================================================
const navbar = document.getElementById('navbar');
const scrollProgress = document.getElementById('scrollProgress');
const backToTop = document.getElementById('backToTop');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNavLink() {
    const scrollY = window.pageYOffset + 120;
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + sectionId) link.classList.add('active');
            });
        }
    });
}

function onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    if (navbar) navbar.classList.toggle('scrolled', scrollTop > 30);
    if (scrollProgress) scrollProgress.style.width = progress + '%';
    if (backToTop) backToTop.classList.toggle('visible', scrollTop > 400);
    updateActiveNavLink();
}
window.addEventListener('scroll', onScroll, { passive: true });

// =====================================================================
// 7. BACK TO TOP
// =====================================================================
if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// =====================================================================
// 8. TYPING EFFECT (Hero)
// =====================================================================
const typedText = document.getElementById('typedText');
const phrases = (content?.profile?.typedPhrases || []).filter(Boolean);

if (typedText && phrases.length) {
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeEffect = () => {
        const current = phrases[phraseIndex];
        if (isDeleting) {
            typedText.textContent = current.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typedText.textContent = current.substring(0, charIndex + 1);
            charIndex++;
        }
        let typeSpeed = isDeleting ? 50 : 100;
        if (!isDeleting && charIndex === current.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typeSpeed = 500;
        }
        setTimeout(typeEffect, typeSpeed);
    };
    typeEffect();
}

// =====================================================================
// 9. ANIMATION DES COMPTEURS (stats)
// =====================================================================
const counters = document.querySelectorAll('.stat-number');
let countersAnimated = false;

function animateCounter(el, target) {
    if (!target) { el.textContent = 0; return; }
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 50));
    const interval = 1500 / (target / step);
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = current;
    }, interval);
}

if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersAnimated) {
                countersAnimated = true;
                counters.forEach(counter => animateCounter(counter, parseInt(counter.getAttribute('data-target'), 10)));
            }
        });
    }, { threshold: 0.3 });
    counterObserver.observe(counters[0].closest('.about-stats') || counters[0]);
}

// =====================================================================
// 10. PROJETS + FILTRES
// =====================================================================
const projectsGrid = document.getElementById('projectsGrid');
const projects = R.orderProjects(content?.projects?.items);

function renderProjects(filter = 'all') {
    if (!projectsGrid) return;
    const filtered = filter === 'all' ? projects : projects.filter(p => p.category === filter);
    projectsGrid.innerHTML = filtered
        .map((project, idx) => R.renderProjectCard(project, idx, { allowDataImage: isPreview }))
        .join('');
}
renderProjects();

const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects(btn.getAttribute('data-filter'));
    });
});

// =====================================================================
// 11. FORMULAIRE DE CONTACT
// =====================================================================
// URL du Worker Cloudflare qui envoie l'email via Resend (voir contact-worker/).
// La clé API Resend reste côté serveur : elle ne doit JAMAIS apparaître ici.
const CONTACT_ENDPOINT = 'https://contact-form.yacineberkani32.workers.dev';
const contactEmail = content?.contact?.email || 'yacineberkani32@gmail.com';

const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

function showFormStatus(message, type) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = 'form-status ' + type;
    formStatus.style.display = 'block';
}

if (contactForm) {
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.querySelector('span') : null;
    const defaultLabel = submitLabel ? submitLabel.textContent : '';

    // Compteur de caractères du message
    const messageInput = document.getElementById('message');
    const messageCounter = document.getElementById('messageCounter');
    const updateCounter = () => {
        if (messageInput && messageCounter) {
            messageCounter.textContent = messageInput.value.length + ' / ' + messageInput.maxLength;
        }
    };
    if (messageInput) messageInput.addEventListener('input', updateCounter);
    contactForm.addEventListener('reset', () => setTimeout(updateCounter, 0));

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const data = {
            firstName: (formData.get('firstName') || '').trim(),
            lastName: (formData.get('lastName') || '').trim(),
            email: (formData.get('email') || '').trim(),
            company: (formData.get('company') || '').trim(),
            sector: formData.get('sector') || '',
            subject: formData.get('subject') || '',
            message: (formData.get('message') || '').trim(),
            website: formData.get('website') || '' // honeypot
        };

        if (!data.firstName || !data.lastName || !data.email || !data.sector || !data.subject || !data.message) {
            showFormStatus('Merci de vous présenter : prénom, nom, email, secteur d\'activité, sujet et message sont obligatoires.', 'error');
            return;
        }
        if (!formData.get('consent')) {
            showFormStatus('Merci d\'accepter l\'utilisation de vos informations pour que je puisse vous répondre.', 'error');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            showFormStatus('Veuillez saisir une adresse email valide.', 'error');
            return;
        }
        if (data.message.length < 10) {
            showFormStatus('Votre message est un peu court (10 caractères minimum).', 'error');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (submitLabel) submitLabel.textContent = 'Envoi en cours...';

        try {
            const res = await fetch(CONTACT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Erreur lors de l\'envoi.');

            showFormStatus('Merci ' + data.firstName + ' ! Votre message a bien été envoyé, je vous réponds rapidement.', 'success');
            contactForm.reset();
            setTimeout(() => {
                formStatus.style.display = 'none';
                formStatus.classList.remove('success', 'error');
            }, 6000);
        } catch (err) {
            const msg = (err instanceof TypeError || !err || !err.message)
                ? 'Impossible de contacter le serveur.'
                : err.message;
            showFormStatus(msg + ' Vous pouvez aussi m\'écrire directement à ' + contactEmail + '.', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (submitLabel) submitLabel.textContent = defaultLabel;
        }
    });
}

// =====================================================================
// 12. SMOOTH SCROLL POUR LES ANCRES
// =====================================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 70;
            window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
    });
});

// =====================================================================
// 13. FOOTER YEAR + CONSOLE EASTER EGG
// =====================================================================
const yearEl = document.getElementById('currentYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

console.log('%c👋 Salut ! Tu es curieux(se) ?', 'color: #6366f1; font-size: 20px; font-weight: bold;');
console.log(`%cJe suis ${content ? content.profile.firstName + ' ' + content.profile.lastName : 'Yacine Berkani'}, ML Engineer 🤖\nContact: ${contactEmail}`,
    'color: #8b5cf6; font-size: 14px;');
