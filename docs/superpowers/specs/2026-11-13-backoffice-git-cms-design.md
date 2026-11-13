# Back-office du portfolio — CMS basé sur Git (approche A)

*Statut : proposition, en attente de validation — 13/11/2026*

## 1. Intention

Rendre **tout le contenu** du portfolio `yacineberkani.github.io` administrable depuis une interface web privée, sans toucher au code ni redéployer à la main, **en conservant à l'identique le design actuel**.

Contrainte absolue : **100 % gratuit**, sans carte bancaire, sans abonnement, sans base de données, sans backend ni Worker supplémentaire, sans serveur, sans Docker, sans framework lourd.

### Objectifs
- Modifier profil, expériences, projets, compétences, formations/certifications, statistiques, textes, contact, visibilité des sections.
- Ajouter / remplacer des images.
- Prévisualiser avant de publier ; publier = un commit ; GitHub Pages met le site à jour seul.

### Non-objectifs
- Refonte graphique du portfolio.
- Multi-utilisateurs, rôles, workflow de validation.
- Édition du CSS / de la mise en page depuis l'admin.
- Le formulaire de contact (Worker Resend existant) reste tel quel.

### Anti-objectifs (échec même si « ça marche »)
- Le token GitHub apparaît dans le code, dans un commit, dans `localStorage`, ou dans une URL.
- Le portfolio public change visuellement (hors contenu).
- Un contenu saisi dans l'admin peut injecter du HTML/JS sur le site public (XSS).

## 2. Faisabilité avec le dépôt actuel — validée

| Point | Constat | Conséquence |
|---|---|---|
| Hébergement | GitHub Pages, site statique, dépôt public `yacineberkani/yacineberkani.github.io`, branche `main` | Publication = commit sur `main`, redéploiement automatique (~30 s – 2 min). |
| Stack | HTML/CSS/JS vanilla, aucun build | L'admin peut être en vanilla ES modules, sans bundler. |
| Contenu | Presque tout est **en dur dans `index.html`** (hero, about, stats, compétences, expériences, formations, certifications, contact, footer) ; seuls les **projets** sont déjà des données (`js/script.js:243`) et les phrases du *typing effect* (`js/script.js:161`) | Il faut extraire le contenu vers `data/content.json` et faire générer ces sections par JS, **avec exactement les mêmes balises et classes CSS** → design inchangé. |
| API GitHub depuis le navigateur | `api.github.com` accepte le CORS avec en-tête `Authorization` | L'admin parle directement à GitHub, aucun intermédiaire. |
| Authentification | *Fine-grained Personal Access Token* limitable à **un seul dépôt** et à la permission **Contents: Read and write** | Gratuit, sans service externe. |
| Coût | GitHub Pages + API + Actions gratuits pour dépôt public | 0 €. |
| Sécurité existante | `createProjectCard` injecte les champs via `innerHTML` sans échappement | À corriger : obligatoire dès que le contenu devient éditable. |

## 3. Approches considérées

- **A — CMS Git, admin vanilla, PAT** *(choisie par Yacine)* : aucune infra, historique Git = versions et retour arrière ; délai de publication ~1 min.
- B — Cloudflare Worker + D1 + R2 + Access : publication instantanée, vraie base ; écartée (backend et services supplémentaires).
- C — Next.js + Supabase : écartée (réécriture complète, complexité inutile).

## 4. Structure de fichiers

```
/
├── index.html                 # même structure ; les sections deviennent des conteneurs vides
│                              #   remplis par JS (balises/classes identiques)
├── css/style.css              # INCHANGÉ
├── js/
│   ├── script.js              # interactions existantes (thème, nav, AOS, typing, compteurs,
│   │                          #   filtres, formulaire) — initialisées APRÈS le rendu
│   ├── content.js             # charge data/content.json (ou le brouillon en mode aperçu)
│   └── render.js              # fonctions de rendu par section, échappement systématique
├── data/
│   └── content.json           # SOURCE UNIQUE DU CONTENU
├── assets/
│   ├── images/
│   │   ├── profile/           # photo(s) de profil
│   │   └── projects/          # visuels de projets
│   └── icons/                 # inchangé
├── admin/
│   ├── index.html             # point d'entrée du back-office (noindex, CSP stricte)
│   ├── admin.css              # design system de l'admin (style Linear/Vercel, clair/sombre)
│   └── js/
│       ├── app.js             # démarrage, routeur (#/dashboard, #/projects…), garde d'auth
│       ├── auth.js            # saisie/validation du token, stockage en mémoire, déconnexion
│       ├── github.js          # client API GitHub (lecture, commit atomique, conflits)
│       ├── store.js           # état : version publiée, brouillon, diff, autosauvegarde
│       ├── schema.js          # règles de validation du content.json (partagées avec les tests)
│       ├── images.js          # contrôle, redimensionnement, conversion WebP
│       ├── ui.js              # composants : toasts, modale de confirmation, tableaux, tags
│       └── views/             # dashboard, profile, experiences, projects, skills,
│                              #   education, content (textes/stats/sections), publish
├── tests/                     # tests node:test (validation, rendu, échappement) + E2E Playwright
├── contact-worker/            # inchangé
└── docs/                      # ce document + guide d'utilisation de l'admin
```

URL de l'admin : `https://yacineberkani.github.io/admin/`. Elle est publique mais **inutile sans token** (elle ne contient aucune donnée privée, tout le contenu est déjà public).

## 5. Modèle `data/content.json`

Principes : un seul fichier ; tableaux ordonnés (l'ordre du tableau = ordre d'affichage) ; chaque élément a un `id` stable ; texte riche limité à un mini-balisage sûr : `**gras**` → `<strong>`, `==surligné==` → `<span class="highlight">` (rendu par le code, jamais de HTML brut) ; icônes = noms Font Awesome validés par motif `^fa[bsr]? fa-[a-z0-9-]+$`.

```jsonc
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-13T10:00:00Z",

  "meta": {                                   // <head> + footer
    "siteTitle": "Yacine Berkani | ML Engineer",
    "description": "Portfolio de Yacine Berkani - ML Engineer…",
    "footerTagline": "ML Engineer — Transformer les modèles en services robustes et scalables."
  },

  "profile": {
    "firstName": "Yacine", "lastName": "Berkani",
    "title": "ML Engineer",
    "photo": { "src": "assets/images/Media.jpg", "alt": "Yacine Berkani - ML Engineer" },
    "availability": {
      "status": "open",                        // open | freelance | mission | unavailable
      "label": "Disponible pour de nouvelles opportunités"
    },
    "yearsOfExperience": 3,
    "typedPhrases": ["ML Engineer", "MLOps Specialist", "LLM & RAG Expert", "…"],
    "heroDescription": "Ingénieur Machine Learning … **LLM, RAG, MLOps** …",
    "heroBadges": [ { "icon": "fas fa-brain", "label": "ML" }, "…4 badges" ],
    "about": {
      "subtitle": "Passionné par l'industrialisation de l'IA",
      "paragraphs": ["Je travaille sur des sujets de ==machine learning en production==, …", "…"],
      "facts": [
        { "icon": "fas fa-map-marker-alt", "label": "Localisation", "value": "Île-de-France" },
        { "icon": "fas fa-graduation-cap", "label": "Formation", "value": "Master Big Data - Data Science" },
        { "icon": "fas fa-language", "label": "Langues", "value": "FR, EN, Kabyle" }
      ]
    }
  },

  "contact": {
    "heading": "Discutons de votre projet",
    "text": "Vous avez un projet ML en tête…",
    "email": "yacineberkani32@gmail.com",
    "links": [                                  // hero, contact et footer
      { "id": "github",   "label": "GitHub",   "display": "@yacineberkani", "url": "https://github.com/yacineberkani", "icon": "fab fa-github" },
      { "id": "linkedin", "label": "LinkedIn", "display": "yacine-berkani", "url": "https://www.linkedin.com/in/…", "icon": "fab fa-linkedin-in" }
    ]
  },

  "stats": [
    { "id": "st1", "value": 24, "suffix": "+", "label": "Projets GitHub" },
    { "id": "st2", "value": 15, "suffix": "+", "label": "Technologies maîtrisées" },
    { "id": "st3", "value": 95, "suffix": "%", "label": "Taux de détection projet IA" }
  ],

  "skills": {
    "subtitle": "Les technologies que j'utilise au quotidien",
    "categories": [
      { "id": "ml", "name": "Machine Learning & IA", "icon": "fas fa-brain",
        "items": [ { "name": "TensorFlow" }, { "name": "Python", "level": "Expert" } ] }
    ]
  },

  "experiences": [
    { "id": "exp-assystem", "role": "ML Engineer", "company": "Assystem EOS",
      "start": "2024-10", "end": "2026-02",      // end: null = « Aujourd'hui »
      "description": "Conception d'une solution complète sur **GCP** …",
      "results": [ { "icon": "fas fa-rocket", "label": "-60% temps d'analyse" } ],
      "technologies": ["GCP", "Airflow", "FastAPI", "Cloud Run", "QLoRA"] }
  ],

  "education": [
    { "id": "edu-m1", "degree": "Master 1 Recherche Opérationnelle", "school": "UMMTO", "year": "2019" }
  ],

  "certifications": [
    { "id": "cert-cc", "title": "Claude Code in Action", "issuer": "Anthropic Academy",
      "date": "2026-07", "url": "https://verify.skilljar.com/c/…", "icon": "fas fa-terminal" }
  ],

  "projects": {
    "subtitle": "Une sélection de mes projets GitHub",
    "categories": [                             // boutons de filtre
      { "id": "ml", "label": "Machine Learning" }, { "id": "llm", "label": "LLM / RAG" },
      { "id": "data", "label": "Data Engineering" }, { "id": "web", "label": "Web" }
    ],
    "items": [
      { "id": "agent-finops-gcp", "title": "Agent FinOps GCP",
        "description": "Assistant IA pour l'optimisation des coûts GCP …",
        "category": "llm", "categoryLabel": "AI Agent / GCP", "icon": "fas fa-coins",
        "image": null,                          // ex. "assets/images/projects/agent-finops-gcp-3f9a.webp"
        "videoUrl": "https://github.com/user-attachments/assets/…",
        "tags": ["Python", "GCP", "BigQuery"],
        "date": "2026-06",
        "links": { "github": null, "demo": null, "docs": null },
        "poc": true,                            // badge « POC Interne » si pas de lien GitHub
        "featured": true }                      // mis en avant (affiché en premier)
    ]
  },

  "sections": {                                 // visibilité + libellés d'en-tête + menu
    "about":      { "visible": true, "tag": "01 — À propos",    "title": "Qui suis-je ?" },
    "skills":     { "visible": true, "tag": "02 — Compétences", "title": "Stack Technique" },
    "experience": { "visible": true, "tag": "03 — Parcours",    "title": "Expérience professionnelle" },
    "projects":   { "visible": true, "tag": "04 — Portfolio",   "title": "Projets récents" },
    "contact":    { "visible": true, "tag": "05 — Contact",     "title": "Travaillons ensemble" }
  }
}
```

Dates stockées en `AAAA-MM`, formatées en français à l'affichage (« Oct 2024 — Fév 2026 »). La numérotation « 01 — … » sera recalculée automatiquement selon les sections visibles (choix proposé ; sinon saisie libre).

Le premier `content.json` sera généré **à partir du contenu actuel exact** du site : rien ne disparaît.

## 6. Communication Back-office ↔ GitHub

### 6.1 Authentification (PAT fine-grained)
1. Yacine crée une fois un token sur GitHub › Settings › Developer settings › *Fine-grained tokens* :
   - **Repository access** : *Only select repositories* → `yacineberkani.github.io` uniquement ;
   - **Permissions** : *Contents : Read and write* (*Metadata : Read* est ajouté d'office) ; optionnel *Pages : Read* pour afficher l'état du déploiement ;
   - **Expiration** : 90 jours conseillés (renouvelable).
   Il le range dans son gestionnaire de mots de passe.
2. Sur `/admin/`, écran de connexion : champ mot de passe (`autocomplete="off"`), collage du token.
3. Vérifications immédiates : `GET /user` (le login doit être `yacineberkani`, sinon refus) et `GET /repos/yacineberkani/yacineberkani.github.io` (`permissions.push === true`). Message d'erreur clair si le token est invalide, expiré ou mal limité.
4. **Stockage : uniquement en mémoire** (variable d'un module JS fermé). Jamais `localStorage`, `sessionStorage`, cookie ni URL. Conséquence assumée : recharger ou fermer l'onglet = reconnexion.
5. **Session** : déconnexion manuelle (efface la variable), déconnexion automatique après 30 min d'inactivité, et sur toute réponse `401` de GitHub. Avertissement `beforeunload` s'il reste des modifications non publiées.

### 6.2 Lecture
- `GET /repos/{o}/{r}/contents/data/content.json?ref=main` → contenu + `sha` du fichier ; `GET /repos/{o}/{r}/git/ref/heads/main` → `sha` du commit de base mémorisé.
- Liste des images : `GET /repos/{o}/{r}/contents/assets/images/projects` (et `profile`).
- Dashboard : `GET /repos/{o}/{r}/commits?path=data/content.json&per_page=5` (dernières publications) + compteurs calculés depuis le JSON.

### 6.3 Écriture — un commit atomique par publication
Une publication peut contenir le JSON **et** plusieurs images. Pour qu'elle forme **un seul commit** (et un seul redéploiement), on utilise l'API Git Data :
1. `POST /git/blobs` pour chaque nouvelle image (base64) et pour `content.json` ;
2. `POST /git/trees` avec `base_tree` = arbre du commit de base (+ entrées `sha: null` pour supprimer les images devenues inutilisées) ;
3. `POST /git/commits` (message : `admin: <résumé des changements>`, parent = commit de base) ;
4. `PATCH /git/refs/heads/main` **sans `force`**.

**Conflits** : si `main` a bougé depuis le chargement (commit fait ailleurs), l'étape 4 échoue (`422`). L'admin recharge alors la version distante et propose : *réappliquer mes modifications par-dessus* ou *abandonner*. Aucune écriture ne peut écraser silencieusement un autre commit.

## 7. Publication, brouillon et aperçu

- **Brouillon** : chaque modification met à jour le brouillon en mémoire, sauvegardé automatiquement dans `localStorage` (contenu uniquement — **jamais le token** ; il ne contient rien qui ne soit déjà public). Un bandeau « N modifications non publiées » et un diff lisible par section.
- **Enregistrer** (par formulaire) = valider et mettre dans le brouillon. **Publier** (bouton global) = commit. On publie donc par lot, ce qui limite le nombre de déploiements.
- **Aperçu** : l'admin ouvre `/?preview=1` dans une iframe/onglet ; même origine (`yacineberkani.github.io`), le brouillon est transmis par `postMessage` (origine vérifiée). Le site public s'affiche **avec son vrai design** et le contenu non publié, sans aucun commit. Bascule bureau / tablette / mobile.
- **Suivi du déploiement** : après le commit, l'admin interroge toutes les 10 s `content.json` publié (ou l'API Pages si la permission est donnée) jusqu'à voir le nouvel `updatedAt`, puis affiche « En ligne ✓ » avec un lien.
- **Historique / retour arrière** : la vue Publication liste les derniers commits de `content.json` ; « Restaurer cette version » charge l'ancien JSON comme brouillon, à republier.
- **Site public** : `fetch('data/content.json', { cache: 'no-cache' })` (revalidation ETag, évite le cache de 10 min de GitHub Pages), puis rendu, puis initialisation des animations existantes (AOS, typing, compteurs, filtres). En cas d'échec du chargement, message discret et sections masquées proprement.

## 8. Gestion des images

- Import par glisser-déposer ou sélecteur ; aperçu immédiat.
- Contrôles côté navigateur : type réel vérifié par **signature binaire** (JPEG, PNG, WebP uniquement — **SVG refusé**, vecteur XSS), taille d'entrée ≤ 10 Mo.
- Traitement : redimensionnement par `<canvas>` (max 1600 px ; 800 px pour la photo de profil), conversion **WebP qualité ~0,82** → typiquement < 300 Ko. Le ré-encodage supprime aussi les métadonnées EXIF (GPS…).
- Nommage : `assets/images/projects/<slug>-<hash8>.webp` (le hash évite les problèmes de cache et les collisions).
- Remplacement : la nouvelle image est ajoutée, l'ancienne supprimée dans le même commit si plus aucun contenu ne la référence.
- Les images n'arrivent sur GitHub qu'au moment de la publication (elles restent en mémoire dans le brouillon jusque-là ; non conservées après rechargement — signalé à l'écran).

## 9. Interface d'administration

Vanilla HTML/CSS/JS, design sobre inspiré de Linear/Vercel, thème clair/sombre, responsive (sidebar repliable en tiroir sur mobile).

- **Sidebar** : Tableau de bord · Profil · Expériences · Projets · Compétences · Formations & certifications · Contenu (textes, stats, sections, contact) · Médias · Publication.
- **Tableau de bord** : compteurs (projets, mis en avant, expériences, compétences, certifications), date et auteur de la dernière publication, modifications en attente, état du site, rappel d'expiration du token si connue.
- **Listes** en tableau : réordonnancement par glisser-déposer + boutons ↑/↓ (accessibles clavier), actions éditer / dupliquer / supprimer.
- **Formulaires** : validation en direct (champs requis, longueurs max, URL `https://` uniquement, dates cohérentes début ≤ fin), éditeur de tags, sélecteur d'icône avec aperçu.
- **Suppression** : modale de confirmation systématique.
- **Retours visuels** : toasts succès/erreur, états de chargement, messages d'erreur GitHub traduits en français.

## 10. Sécurité

| Risque | Mesure |
|---|---|
| Fuite du token via le code | Jamais dans le dépôt ; saisi à chaque session. Le *secret scanning* GitHub révoque automatiquement un token commité par erreur. |
| Token persistant dans le navigateur | Stockage mémoire uniquement ; expiration auto 30 min d'inactivité. |
| Portée excessive du token | Fine-grained, un seul dépôt, Contents R/W uniquement, expiration 90 j. Pire cas en cas de vol : modification du dépôt du portfolio (réversible via l'historique Git). |
| XSS sur le site public via le contenu | Rendu par `textContent` / échappement systématique ; mini-balisage (`**`, `==`) converti par le code ; URLs filtrées (`https:`/`mailto:` uniquement) ; icônes validées par regex ; correction de l'injection actuelle dans `createProjectCard`. |
| XSS dans l'admin (là où le token vit) | Aucun script tiers dans l'admin (pas de CDN : icônes en SVG inline) ; **CSP** stricte en `<meta>` : `default-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data: blob:; script-src 'self'; style-src 'self'`. Limite : GitHub Pages ne permet pas d'en-têtes HTTP, donc pas d'anti-clickjacking (`frame-ancestors`) ; un script de l'admin refuse de s'exécuter s'il est chargé dans une iframe (`window.top !== window.self`). |
| Fichiers malveillants | Signature binaire, SVG refusé, ré-encodage canvas, taille max. |
| Données invalides publiées | Validation `schema.js` à la saisie **et** avant chaque commit (le commit est bloqué si le JSON global est invalide). Le site public valide aussi la structure minimale et ignore les éléments mal formés. |
| Écrasement concurrent | Mise à jour de ref sans `force` + détection de conflit. |
| Indexation de l'admin | `<meta name="robots" content="noindex">` + `robots.txt` `Disallow: /admin/`. |
| Extensions navigateur malveillantes | Hors de contrôle de l'app : recommander un profil navigateur dédié sans extensions pour l'admin. |

**« Validation backend »** : il n'y a pas de backend. Les garde-fous côté serveur sont ceux de GitHub (token limité, refus des écritures non autorisées, ref non forcée). En option, une **GitHub Action gratuite** (dépôt public) peut valider `content.json` à chaque push et signaler un JSON invalide — elle ne bloque pas la publication sur Pages. Proposée en étape facultative.

## 11. Limites assumées

- **Délai de publication** : ~30 s à 2 min (build GitHub Pages).
- **Quota de builds Pages** : limite souple ~10 builds/heure → publier par lots (c'est le rôle du bouton global).
- **Reconnexion** à chaque rechargement/nouvel onglet (conséquence du token non persistant).
- **Référencement** : le contenu étant rendu en JavaScript, les moteurs qui n'exécutent pas JS ne voient pas le détail (Google l'exécute). `<title>` et `<meta description>` restent écrits en dur dans `index.html` et seront mis à jour par l'admin dans le même commit (l'admin réécrit ces deux balises) pour garder un bon SEO de base. *Option ultérieure gratuite* : une GitHub Action qui pré-rend le HTML depuis le JSON.
- **Taille du dépôt** : chaque remplacement d'image reste dans l'historique Git ; avec des WebP < 300 Ko c'est négligeable (limite recommandée 1 Go).
- **Expiration du token** : à renouveler tous les 90 jours (l'admin avertit si GitHub renvoie la date d'expiration via l'en-tête `github-authentication-token-expiration`).
- **Navigateur moderne requis** (ES modules, WebP via canvas : tous les navigateurs actuels).
- Le contenu de `content.json` est **public** (dépôt public) — normal, c'est le contenu du site ; n'y mettre aucune donnée privée.

## 12. Plan de développement

1. **Extraction du contenu** — générer `data/content.json` fidèle au site actuel + `admin/js/schema.js` + tests de validation.
2. **Front piloté par les données** — `js/content.js` et `js/render.js` ; sections rendues avec les balises/classes actuelles ; échappement ; réinitialisation des animations ; rendu conditionnel des sections masquées et du menu.
   *Critère : captures Playwright avant/après (clair, sombre, mobile) identiques au pixel près.*
3. **Socle admin** — connexion par token, client GitHub (lecture), layout sidebar/topbar, routeur, thème, toasts, modale.
4. **Vues d'édition** — Profil, Expériences, Projets, Compétences, Formations & certifications, Contenu général (stats, textes, contact, sections) ; validation, tri, suppression confirmée.
5. **Médias** — import, contrôle, WebP, remplacement, nettoyage.
6. **Brouillon, aperçu, publication** — autosauvegarde, diff, aperçu `postMessage`, commit atomique, conflits, suivi du déploiement, historique/restauration ; tableau de bord.
7. **Durcissement sécurité** — CSP, `noindex`/`robots.txt`, déconnexion auto, tests d'injection (payloads XSS dans chaque champ).
8. **Tests** — unitaires `node:test` (validation, rendu, échappement, nommage images) ; E2E Playwright avec l'API GitHub simulée (connexion, CRUD, image, publication, conflit, token refusé).
9. **Mise en production** — guide `docs/admin.md` (création du token pas à pas, utilisation, restauration), mise à jour du README, fusion sur `main`, premier test réel de publication.
10. *(Optionnel)* GitHub Action de validation du JSON, puis pré-rendu SEO.

## 13. Choix faits par Claude (à vérifier)
- Mini-balisage `**gras**` / `==surligné==` plutôt que HTML libre (sécurité).
- Numérotation des sections automatique.
- Déconnexion après 30 min d'inactivité.
- Images converties en WebP, SVG interdit.
- Brouillon (sans token) conservé dans `localStorage` pour ne rien perdre en cas de rechargement.
- Projets `featured` affichés en premier dans la grille (aucun nouvel élément visuel).
- `<title>`/`<meta description>` réécrits dans `index.html` par l'admin pour le SEO.
