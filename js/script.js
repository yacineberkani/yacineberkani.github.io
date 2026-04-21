/* =========================================================================
   Portfolio - Yacine Berkani | ML Engineer
   JavaScript principal : animations, navigation, thème, projets dynamiques
   ========================================================================= */

(() => {
    'use strict';

    // =====================================================================
    // 1. PRELOADER
    // =====================================================================
    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            setTimeout(() => {
                preloader.classList.add('hidden');
                setTimeout(() => preloader.remove(), 600);
            }, 500);
        }
    });

    // =====================================================================
    // 2. AOS INIT (animations au scroll)
    // =====================================================================
    if (window.AOS) {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 100,
            disable: 'mobile' ? false : false,
        });
    }

    // =====================================================================
    // 3. THEME TOGGLE (dark / light)
    // =====================================================================
    const themeToggle = document.getElementById('themeToggle');
    const htmlEl = document.documentElement;

    // Initialiser le thème depuis localStorage ou préférence système
    const savedTheme = localStorage.getItem('portfolio-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    setTheme(initialTheme);

    function setTheme(theme) {
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('portfolio-theme', theme);
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = htmlEl.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    // =====================================================================
    // 4. NAVIGATION MOBILE
    // =====================================================================
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Fermer le menu au clic sur un lien
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // =====================================================================
    // 5. NAVBAR SCROLL EFFECT
    // =====================================================================
    const navbar = document.getElementById('navbar');
    const scrollProgress = document.getElementById('scrollProgress');
    const backToTop = document.getElementById('backToTop');

    function onScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;

        // Navbar background au scroll
        if (navbar) {
            navbar.classList.toggle('scrolled', scrollTop > 30);
        }

        // Scroll progress bar
        if (scrollProgress) {
            scrollProgress.style.width = progress + '%';
        }

        // Back to top
        if (backToTop) {
            backToTop.classList.toggle('visible', scrollTop > 400);
        }

        // Active nav link
        updateActiveNavLink();
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // =====================================================================
    // 6. ACTIVE NAV LINK AU SCROLL
    // =====================================================================
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
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // =====================================================================
    // 7. BACK TO TOP
    // =====================================================================
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // =====================================================================
    // 8. TYPING EFFECT (Hero)
    // =====================================================================
    const typedText = document.getElementById('typedText');
    const phrases = [
        'ML Engineer',
        'MLOps Specialist',
        'LLM & RAG Expert',
        'Cloud Architect GCP',
        'Data Engineer'
    ];

    if (typedText) {
        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function typeEffect() {
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
        }

        typeEffect();
    }

    // =====================================================================
    // 9. ANIMATION DES COMPTEURS (stats)
    // =====================================================================
    const counters = document.querySelectorAll('.stat-number');
    let countersAnimated = false;

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersAnimated) {
                countersAnimated = true;
                counters.forEach(counter => {
                    const target = parseInt(counter.getAttribute('data-target'));
                    animateCounter(counter, target);
                });
            }
        });
    }, { threshold: 0.3 });

    if (counters.length > 0) {
        counterObserver.observe(counters[0].closest('.about-stats') || counters[0]);
    }

    function animateCounter(el, target) {
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 50));
        const duration = 1500;
        const interval = duration / (target / step);

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = current;
        }, interval);
    }

    // =====================================================================
    // 10. DONNÉES DES PROJETS (GitHub)
    // =====================================================================
    const projects = [
        {
            title: 'RAG Multi-Documents',
            description: 'Projet destiné aux utilisateurs souhaitant extraire et analyser des informations de plusieurs fichiers PDF via une architecture RAG avec LLM.',
            category: 'llm',
            categoryLabel: 'LLM / RAG',
            icon: 'fa-file-lines',
            tags: ['Python', 'LLM', 'RAG', 'PDF'],
            date: 'Mai 2024',
            link: 'https://github.com/yacineberkani/Rag_multidoc',
            featured: true
        },
        {
            title: 'Update Scraper Project',
            description: "Modèle NLP capable de comprendre l'intention de l'utilisateur et d'identifier les sources d'articles via topic modelling et scraping intelligent.",
            category: 'ml',
            categoryLabel: 'NLP',
            icon: 'fa-magnifying-glass',
            tags: ['Python', 'NLP', 'Topic Modeling', 'Scraping'],
            date: 'Mars 2026',
            link: 'https://github.com/yacineberkani/Update_Scraper_Project'
        },
        {
            title: 'Détection de Tumeurs Cérébrales',
            description: "Classification d'images médicales (IRM) pour la détection de tumeurs cérébrales avec un modèle CNN VGG16 sous TensorFlow/Keras. 91% d'accuracy.",
            category: 'ml',
            categoryLabel: 'Computer Vision',
            icon: 'fa-brain',
            tags: ['Python', 'TensorFlow', 'CNN', 'VGG16'],
            date: 'Mai 2024',
            link: 'https://github.com/yacineberkani/Detection_de_Tumeurs',
            featured: true
        },
        {
            title: 'Projet Index - Recherche documentaire',
            description: "Système d'indexation et de recherche pour stocker, indexer et rechercher efficacement des informations dans un corpus de documents textuels.",
            category: 'ml',
            categoryLabel: 'IR / NLP',
            icon: 'fa-list-ol',
            tags: ['Python', 'Indexation', 'NLP'],
            date: 'Mars 2026',
            link: 'https://github.com/yacineberkani/projetINDEX'
        },
        {
            title: 'Scraper ArXiv',
            description: 'Outil de téléchargement automatique d\'articles scientifiques depuis la plateforme arXiv en fonction de requêtes utilisateur.',
            category: 'data',
            categoryLabel: 'Data Engineering',
            icon: 'fa-download',
            tags: ['Python', 'Scraping', 'arXiv'],
            date: 'Mai 2024',
            link: 'https://github.com/yacineberkani/scraping-ArXiv'
        },
        {
            title: 'Scientific Article Scraper',
            description: "Récupération d'articles scientifiques en PDF à partir d'un prompt en langage naturel. Pipeline NLP complet.",
            category: 'llm',
            categoryLabel: 'LLM / NLP',
            icon: 'fa-robot',
            tags: ['Python', 'NLP', 'LLM', 'PDF'],
            date: 'Mai 2024',
            link: 'https://github.com/yacineberkani/Scraper_Project'
        },
        {
            title: 'Big Data Hadoop on GCP',
            description: 'Projet Big Data avec Hadoop et Hive déployé sur Google Cloud Platform. Pipeline de traitement de données à grande échelle.',
            category: 'data',
            categoryLabel: 'Big Data',
            icon: 'fa-database',
            tags: ['Hadoop', 'Hive', 'GCP', 'Big Data'],
            date: 'Nov 2024',
            link: 'https://github.com/yacineberkani/projet-Big-data-Hadoop',
            featured: true
        },
        {
            title: 'GEN AI',
            description: "Projet d'exploration des architectures d'IA générative et prompt engineering sur différents modèles LLM.",
            category: 'llm',
            categoryLabel: 'Generative AI',
            icon: 'fa-wand-magic-sparkles',
            tags: ['LLM', 'GenAI', 'Prompt Engineering'],
            date: 'Jan 2025',
            link: 'https://github.com/yacineberkani/GEN_AI'
        },
        {
            title: 'Transfer Learning - Classification de Tweets',
            description: 'Classification de tweets basée sur le transfer learning avec des modèles pré-entraînés.',
            category: 'ml',
            categoryLabel: 'NLP',
            icon: 'fa-comment-dots',
            tags: ['Transfer Learning', 'NLP', 'Classification'],
            date: 'Avril 2024',
            link: 'https://github.com/yacineberkani/transfert-_learning'
        },
        {
            title: 'Chiffrement',
            description: "Projet d'implémentation d'algorithmes de cryptographie et chiffrement. Exploration de différentes techniques de sécurité.",
            category: 'ml',
            categoryLabel: 'Security',
            icon: 'fa-lock',
            tags: ['Python', 'Cryptography', 'Security'],
            date: 'Déc 2024',
            link: 'https://github.com/yacineberkani/Chiffrement'
        },
        {
            title: 'Formulaire de Connexion',
            description: "Système d'authentification permettant aux utilisateurs de s'inscrire et se connecter via email unique avec mot de passe sécurisé.",
            category: 'web',
            categoryLabel: 'Web Dev',
            icon: 'fa-user-lock',
            tags: ['Web', 'Auth', 'Backend'],
            date: 'Mai 2024',
            link: 'https://github.com/yacineberkani/Formulaire_de_Connexion'
        },
        {
            title: 'Mon CV',
            description: "Page web personnelle présentant mon parcours professionnel et mes réalisations.",
            category: 'web',
            categoryLabel: 'Personal Site',
            icon: 'fa-id-card',
            tags: ['HTML', 'CSS', 'Portfolio'],
            date: 'Avril 2026',
            link: 'https://github.com/yacineberkani/MonCV'
        }
    ];

    // =====================================================================
    // 11. RENDERING DES PROJETS
    // =====================================================================
    const projectsGrid = document.getElementById('projectsGrid');

    function renderProjects(filter = 'all') {
        if (!projectsGrid) return;

        const filtered = filter === 'all'
            ? projects
            : projects.filter(p => p.category === filter);

        projectsGrid.innerHTML = filtered.map((project, idx) => `
            <article class="project-card" data-category="${project.category}" style="animation-delay: ${idx * 0.08}s">
                <div class="project-icon">
                    <i class="fas ${project.icon}"></i>
                </div>
                <div class="project-header">
                    <h3 class="project-title">${project.title}</h3>
                    <span class="project-category">${project.categoryLabel}</span>
                </div>
                <p class="project-description">${project.description}</p>
                <div class="project-tags">
                    ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
                </div>
                <div class="project-footer">
                    <span class="project-date"><i class="far fa-calendar"></i> ${project.date}</span>
                    <a href="${project.link}" target="_blank" rel="noopener" class="project-link">
                        <span>Voir le code</span>
                        <i class="fab fa-github"></i>
                    </a>
                </div>
            </article>
        `).join('');
    }

    renderProjects();

    // =====================================================================
    // 12. FILTRES PROJETS
    // =====================================================================
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            renderProjects(filter);
        });
    });

    // =====================================================================
    // 13. FORMULAIRE DE CONTACT
    // =====================================================================
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');

            // Validation simple
            if (!name || !email || !subject || !message) {
                showFormStatus('Veuillez remplir tous les champs.', 'error');
                return;
            }

            // Comme il n'y a pas de backend, on ouvre le client mail
            const mailtoLink = `mailto:yacineberkani32@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
                `Nom: ${name}\nEmail: ${email}\n\n${message}`
            )}`;

            showFormStatus('Ouverture de votre client mail...', 'success');
            setTimeout(() => {
                window.location.href = mailtoLink;
                contactForm.reset();
                setTimeout(() => {
                    formStatus.style.display = 'none';
                    formStatus.classList.remove('success', 'error');
                }, 3000);
            }, 800);
        });
    }

    function showFormStatus(message, type) {
        if (!formStatus) return;
        formStatus.textContent = message;
        formStatus.className = 'form-status ' + type;
        formStatus.style.display = 'block';
    }

    // =====================================================================
    // 14. CUSTOM CURSOR (desktop uniquement)
    // =====================================================================
    const cursor = document.getElementById('cursor');
    const cursorFollower = document.getElementById('cursor-follower');

    if (cursor && cursorFollower && window.matchMedia('(min-width: 1025px)').matches) {
     
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
        

        
        });

        function animateFollower() {
          

            followerX += dx * 0.15;
            followerY += dy * 0.15;

            cursorFollower.style.left = followerX + 'px';
            cursorFollower.style.top = followerY + 'px';

            requestAnimationFrame(animateFollower);
        }
        animateFollower();

        // Hover effect sur les éléments interactifs
        const hoverables = document.querySelectorAll('a, button, .skill-category, .project-card, .stat-card');
        hoverables.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorFollower.style.transform = 'scale(1.5)';
                cursorFollower.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
            });
            el.addEventListener('mouseleave', () => {
                cursorFollower.style.transform = 'scale(1)';
                cursorFollower.style.backgroundColor = 'transparent';
            });
        });
    }

    // =====================================================================
    // 15. SMOOTH SCROLL POUR LES ANCRES
    // =====================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 70;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // =====================================================================
    // 16. FOOTER YEAR
    // =====================================================================
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // =====================================================================
    // 17. CONSOLE EASTER EGG
    // =====================================================================
    console.log(
        '%c👋 Salut ! Tu es curieux(se) ?',
        'color: #6366f1; font-size: 20px; font-weight: bold;'
    );
    console.log(
        '%cJe suis Yacine Berkani, ML Engineer 🤖\nContact: yacineberkani32@gmail.com',
        'color: #8b5cf6; font-size: 14px;'
    );

})();
