/* =========================================================================
   Pages d'édition : chaque page décrit ses champs, collectionView/formView
   s'occupent du reste.
   ========================================================================= */
import { state } from '../store.js';
import { AVAILABILITY, SECTION_KEYS } from '../schema.js';
import { collectionView, formView } from './collection.js';

const SECTION_LABELS = { about: 'À propos', skills: 'Compétences', experience: 'Parcours', projects: 'Projets', contact: 'Contact' };
const SUBTITLE_PATH = {
    about: 'profile.about.subtitle', skills: 'skills.subtitle', experience: 'experience.subtitle',
    projects: 'projects.subtitle', contact: 'contact.subtitle'
};
const iconHelp = 'Classe Font Awesome, ex. « fas fa-rocket » (liste : fontawesome.com/search?ic=free).';

export function profilePage() {
    return [
        formView({
            title: 'Identité',
            description: 'Affichée dans l\'en-tête du portfolio.',
            fields: [
                { key: 'profile.photo.src', label: 'Photo de profil', type: 'image', maxSize: 800 },
                { key: 'profile.photo.alt', label: 'Texte alternatif de la photo', required: true, max: 160, full: true },
                { key: 'profile.firstName', label: 'Prénom', required: true, max: 60 },
                { key: 'profile.lastName', label: 'Nom', required: true, max: 60 },
                { key: 'profile.title', label: 'Titre professionnel', required: true, max: 80 },
                { key: 'profile.yearsOfExperience', label: 'Années d\'expérience', type: 'number', help: 'Utilisable dans une statistique (page Contenu).' },
                { key: 'profile.availability.status', label: 'Disponibilité', type: 'select', options: Object.entries(AVAILABILITY).map(([value, label]) => ({ value, label })) },
                { key: 'profile.availability.label', label: 'Texte de disponibilité affiché', required: true, max: 120 },
                { key: 'profile.typedPhrases', label: 'Titres animés (effet machine à écrire)', type: 'tags', help: 'Séparés par des virgules.' },
                { key: 'profile.heroDescription', label: 'Présentation courte (en-tête)', type: 'textarea', rich: true, max: 1000 },
                {
                    key: 'profile.heroBadges', label: 'Badges autour de la photo (4)', type: 'repeater', addLabel: 'Ajouter un badge',
                    help: 'Exactement 4 badges : leurs positions sont fixes.',
                    fields: [{ key: 'label', label: 'Texte' }, { key: 'icon', label: 'Icône', type: 'icon' }]
                }
            ]
        }),
        formView({
            title: 'À propos',
            fields: [
                { key: 'profile.about.paragraphs', label: 'Biographie', type: 'paragraphs', help: 'Un paragraphe par bloc, séparés par une ligne vide.', rich: true },
                {
                    key: 'profile.about.facts', label: 'Informations clés', type: 'repeater', addLabel: 'Ajouter une information',
                    fields: [{ key: 'label', label: 'Libellé' }, { key: 'value', label: 'Valeur' }, { key: 'icon', label: 'Icône', type: 'icon' }]
                }
            ]
        })
    ];
}

export function experiencesPage() {
    return [collectionView({
        path: 'experiences', title: 'Expériences professionnelles', singular: 'une expérience', idPrefix: 'exp-',
        description: 'L\'ordre de la liste est l\'ordre d\'affichage (la plus récente en premier).',
        addLabel: 'Nouvelle expérience',
        itemTitle: (e) => [e.role, e.company].filter(Boolean).join(' · '),
        itemMeta: (e) => `${e.start || '?'} — ${e.end || 'Aujourd\'hui'}`,
        badges: (e) => (e.end ? [] : [{ label: 'En cours', kind: 'success' }]),
        newItem: () => ({ role: '', company: '', start: '', end: '', description: '', results: [], technologies: [] }),
        fields: [
            { key: 'role', label: 'Poste', required: true, max: 80 },
            { key: 'company', label: 'Entreprise', required: true, max: 80 },
            { key: 'start', label: 'Début', required: true, placeholder: 'Oct 2024', max: 30 },
            { key: 'end', label: 'Fin', placeholder: 'Vide = « Aujourd\'hui »', max: 30 },
            { key: 'description', label: 'Missions', type: 'textarea', rich: true, required: true, max: 2000 },
            { key: 'technologies', label: 'Technologies et compétences', type: 'tags' },
            {
                key: 'results', label: 'Résultats chiffrés', type: 'repeater', addLabel: 'Ajouter un résultat',
                fields: [{ key: 'label', label: 'Résultat' }, { key: 'icon', label: 'Icône', type: 'icon' }]
            }
        ]
    })];
}

export function projectsPage() {
    const categoryOptions = () => (state.draft.projects.categories || []).map(c => ({ value: c.id, label: c.label }));
    return [
        collectionView({
            path: 'projects.items', title: 'Projets', singular: 'un projet',
            description: 'Les projets « mis en avant » s\'affichent en tête de la grille.',
            addLabel: 'Nouveau projet',
            itemTitle: (p) => p.title,
            itemMeta: (p) => [p.categoryLabel, p.date].filter(Boolean).join(' · '),
            thumb: (p) => p.image,
            badges: (p) => [
                ...(p.featured ? [{ label: 'Mis en avant', kind: 'accent' }] : []),
                ...(p.links?.github ? [] : [{ label: 'POC interne', kind: 'neutral' }]),
                ...(p.videoUrl ? [{ label: 'Vidéo', kind: 'neutral' }] : [])
            ],
            newItem: () => ({
                title: '', description: '', category: state.draft.projects.categories[0]?.id || '', categoryLabel: '',
                icon: 'fas fa-code', tags: [], date: '', image: '', videoUrl: '', links: { github: '', demo: '', docs: '' }, featured: false
            }),
            fields: [
                { key: 'title', label: 'Titre', required: true, max: 100 },
                { key: 'date', label: 'Date', placeholder: 'Juin 2026', max: 30 },
                { key: 'description', label: 'Description', type: 'textarea', required: true, max: 1000 },
                { key: 'category', label: 'Filtre', type: 'select', options: categoryOptions },
                { key: 'categoryLabel', label: 'Libellé de catégorie affiché', required: true, max: 40 },
                { key: 'icon', label: 'Icône', type: 'icon', help: iconHelp },
                { key: 'featured', label: 'Mise en avant', type: 'checkbox', checkboxLabel: 'Afficher en tête' },
                { key: 'tags', label: 'Technologies', type: 'tags' },
                { key: 'image', label: 'Image de présentation', type: 'image', removable: true, help: 'Ignorée si une vidéo est renseignée.' },
                { key: 'videoUrl', label: 'Vidéo (lien .mp4)', type: 'url', placeholder: 'https://…' },
                { key: 'links.github', label: 'Lien GitHub', type: 'url', placeholder: 'https://github.com/…', help: 'Vide = badge « POC Interne ».' },
                { key: 'links.demo', label: 'Lien de démonstration', type: 'url', placeholder: 'https://…' },
                { key: 'links.docs', label: 'Lien de documentation', type: 'url', placeholder: 'https://…' }
            ]
        }),
        collectionView({
            path: 'projects.categories', title: 'Filtres de projets', singular: 'un filtre',
            description: 'Boutons au-dessus de la grille (« Tous » est toujours présent).',
            addLabel: 'Nouveau filtre',
            itemTitle: (c) => c.label, itemMeta: (c) => `identifiant : ${c.id || '(auto)'}`,
            newItem: () => ({ label: '' }),
            fields: [{ key: 'label', label: 'Libellé', required: true, max: 40 }]
        })
    ];
}

export function skillsPage() {
    return [collectionView({
        path: 'skills.categories', title: 'Compétences par catégorie', singular: 'une catégorie',
        description: 'Ex. Data Science, IA générative, LLMOps, Cloud, DevOps, Data Engineering…',
        addLabel: 'Nouvelle catégorie',
        itemTitle: (c) => c.name,
        itemMeta: (c) => (c.items || []).map(i => i.name).join(', '),
        badges: (c) => [{ label: `${(c.items || []).length} technos`, kind: 'neutral' }],
        newItem: () => ({ name: '', icon: 'fas fa-code', items: [] }),
        fields: [
            { key: 'name', label: 'Nom de la catégorie', required: true, max: 60 },
            { key: 'icon', label: 'Icône', type: 'icon', help: iconHelp },
            {
                key: 'items', label: 'Technologies', type: 'repeater', addLabel: 'Ajouter une technologie',
                fields: [{ key: 'name', label: 'Nom' }, { key: 'level', label: 'Niveau (optionnel)', optional: true, placeholder: 'Expert' }]
            }
        ]
    })];
}

export function educationPage() {
    return [
        collectionView({
            path: 'education', title: 'Formations', singular: 'une formation', idPrefix: 'edu-',
            addLabel: 'Nouvelle formation',
            itemTitle: (e) => e.degree, itemMeta: (e) => [e.school, e.year].filter(Boolean).join(' · '),
            newItem: () => ({ degree: '', school: '', year: '' }),
            fields: [
                { key: 'degree', label: 'Diplôme', required: true, max: 120, full: true },
                { key: 'school', label: 'Établissement', required: true, max: 120 },
                { key: 'year', label: 'Année', required: true, max: 20 }
            ]
        }),
        collectionView({
            path: 'certifications', title: 'Certifications', singular: 'une certification', idPrefix: 'cert-',
            addLabel: 'Nouvelle certification',
            itemTitle: (c) => c.title, itemMeta: (c) => [c.issuer, c.date].filter(Boolean).join(' · '),
            badges: (c) => (c.url ? [{ label: 'Lien vérifiable', kind: 'success' }] : []),
            newItem: () => ({ title: '', issuer: '', date: '', url: '', icon: 'fas fa-certificate' }),
            fields: [
                { key: 'title', label: 'Intitulé', required: true, max: 120, full: true },
                { key: 'issuer', label: 'Organisme', required: true, max: 80 },
                { key: 'date', label: 'Date', placeholder: 'Juil 2026', max: 30 },
                { key: 'url', label: 'Lien du certificat', type: 'url', placeholder: 'https://…' },
                { key: 'icon', label: 'Icône', type: 'icon', help: iconHelp }
            ]
        })
    ];
}

export function contentPage() {
    const sectionFields = SECTION_KEYS.flatMap(k => [
        { key: `sections.${k}.visible`, label: `${SECTION_LABELS[k]} — visible`, type: 'checkbox', checkboxLabel: 'Afficher la section' },
        { key: `sections.${k}.tag`, label: `${SECTION_LABELS[k]} — étiquette (numérotée automatiquement)`, max: 40 },
        { key: `sections.${k}.title`, label: `${SECTION_LABELS[k]} — titre`, max: 80 },
        { key: SUBTITLE_PATH[k], label: `${SECTION_LABELS[k]} — sous-titre`, max: 160 }
    ]);
    return [
        formView({ title: 'Sections', description: 'Masquez une section : elle disparaît aussi du menu et du pied de page.', fields: sectionFields }),
        collectionView({
            path: 'stats', title: 'Statistiques', singular: 'une statistique', idPrefix: 'stat-',
            description: 'Compteurs animés de la section « À propos ».', addLabel: 'Nouvelle statistique',
            itemTitle: (s) => s.label,
            itemMeta: (s) => (s.source === 'years' ? `${state.draft.profile.yearsOfExperience} (années d'expérience)` : `${s.value ?? ''}${s.suffix || ''}`),
            newItem: () => ({ label: '', value: 0, suffix: '+', source: '' }),
            fields: [
                { key: 'label', label: 'Libellé', required: true, max: 60 },
                { key: 'source', label: 'Valeur', type: 'select', options: [{ value: '', label: 'Nombre saisi ci-dessous' }, { value: 'years', label: 'Années d\'expérience du profil' }] },
                { key: 'value', label: 'Nombre', type: 'number' },
                { key: 'suffix', label: 'Suffixe', placeholder: '+ ou %', max: 5 }
            ]
        }),
        formView({
            title: 'Contact',
            fields: [
                { key: 'contact.email', label: 'Email', type: 'email', required: true },
                { key: 'contact.heading', label: 'Titre du bloc contact', required: true, max: 120 },
                { key: 'contact.text', label: 'Texte d\'introduction', type: 'textarea', max: 800 },
                {
                    key: 'contact.links', label: 'Liens professionnels (en-tête, contact, pied de page)', type: 'repeater', addLabel: 'Ajouter un lien',
                    fields: [
                        { key: 'label', label: 'Nom', placeholder: 'LinkedIn' },
                        { key: 'display', label: 'Texte affiché', placeholder: 'yacine-berkani' },
                        { key: 'url', label: 'Lien', type: 'url', placeholder: 'https://…' },
                        { key: 'icon', label: 'Icône', type: 'icon' },
                        { key: 'id', label: 'Identifiant', placeholder: 'linkedin' }
                    ]
                }
            ]
        }),
        formView({
            title: 'Référencement et pied de page',
            fields: [
                { key: 'meta.siteTitle', label: 'Titre de la page (onglet, Google)', required: true, max: 120 },
                { key: 'meta.description', label: 'Description (Google, réseaux sociaux)', type: 'textarea', rows: 3, max: 300 },
                { key: 'meta.footerTagline', label: 'Phrase du pied de page', max: 200, full: true }
            ]
        })
    ];
}
