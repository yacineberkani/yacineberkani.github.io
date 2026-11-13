# Back-office Git CMS — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rendre tout le contenu du portfolio administrable depuis `/admin/` (vanilla JS + API GitHub + `data/content.json`), sans changer le design public.

**Architecture:** le site public charge `data/content.json`, le transforme en HTML via des fonctions pures (`js/render.js`, mêmes balises/classes qu'aujourd'hui), puis lance les interactions existantes. L'admin (ES modules sans build) lit/écrit le dépôt via l'API GitHub avec un PAT fine-grained gardé en mémoire ; un brouillon est autosauvegardé dans `localStorage` (sans token) et sert à l'aperçu `/?preview=1` ; « Publier » crée un commit atomique (Git Data API).

**Tech Stack:** HTML/CSS/JS vanilla, ES modules, `node:test` (Node 22, sans dépendance), Playwright préinstallé pour les vérifications.

**Spec:** `docs/superpowers/specs/2026-11-13-backoffice-git-cms-design.md`

## Global Constraints
- 0 dépendance npm, 0 build, 0 service payant ; `css/style.css` modifié seulement pour ajouter des règles nécessaires aux nouveaux champs optionnels (image de projet).
- Token : uniquement dans une variable de module (`admin/js/github.js`) ; jamais localStorage/sessionStorage/cookie/URL/fichier.
- Tout texte issu du JSON est échappé ; mini-balisage `**gras**` → `<strong>`, `==x==` → `<span class="highlight">` ; URLs limitées à `https:`, `http:`, `mailto:`, `#…`, chemins `assets/…` (+ `data:image/(png|jpeg|webp)` en aperçu) ; icônes `^(fas|fab|far) fa-[a-z0-9-]+$`.
- Dépôt : `yacineberkani/yacineberkani.github.io`, branche `main`.

## Écarts assumés par rapport au spec (simplification)
- Dates stockées en **texte libre** (« Oct 2024 », « Juin 2026 ») : rendu identique garanti, pas de formatage à maintenir.
- Brouillon (y compris images en `data:` URL) dans `localStorage` ; l'aperçu le lit directement (même origine) — pas de `postMessage`.
- Pas de suppression automatique d'images : la vue Médias liste les images inutilisées, suppression manuelle (une version restaurée garde ainsi ses images).
- Les flags `featured` actuels (non affichés aujourd'hui) passent à `false` ; « mis en avant » = affiché en tête de « Tous ».
- Liste des liens de contact unique (hero, contact, footer) : le bloc Contact affiche Email puis les liens dans l'ordre de la liste.

## Review Focus
1. Contenu contenant `<script>`, `"`, `javascript:` → affiché comme texte / lien neutralisé (tests dans Task 1).
2. Section masquée → section, lien de menu et lien de footer masqués ; numérotation recalculée (Task 1).
3. `content.json` introuvable ou invalide → message discret, pas de page cassée (Task 2).
4. `main` modifié pendant l'édition → publication refusée sans écrasement, choix proposé (Task 4).
5. Token invalide/expiré/sans droit d'écriture → message clair, retour à l'écran de connexion sur 401 (Task 3/4).

---

### Task 1: Données + rendu pur
**Files:** Create `data/content.json`, `js/render.js`, `admin/js/schema.js`, `tests/render.test.mjs`, `tests/schema.test.mjs`, `package.json` (`"type":"module"`, script `test: node --test tests/`).
**Produces:** `render.js` : `escapeHtml(s)`, `richText(s)`, `safeUrl(u, {allowData})`, `safeIcon(c)`, et `renderHero/About/Stats/Skills/Experience/Education/Certifications/ProjectFilters/ProjectCard/ContactMethods/SocialLinks(content)` → `string`. `schema.js` : `validateContent(c) → [{path, message}]`.
- [ ] Tests : échappement, mini-balisage, URL `javascript:` → `#`, icône invalide → `fas fa-circle`, `validateContent` du fichier réel → `[]`, champ requis manquant → erreur avec chemin.
- [ ] Implémenter, `npm test` vert, commit.

### Task 2: Site public piloté par les données (vérif. parité)
**Files:** Modify `index.html` (conteneurs vides à la place du contenu, `type="module"`), `js/script.js` (charge → rend → initialise). Create `scripts/parity-check.mjs`.
- [ ] Sauvegarder le HTML rendu de `main` (avant) section par section via Playwright.
- [ ] Refactor ; preloader masqué après rendu ; `?preview=1` lit le brouillon local.
- [ ] Parité : HTML normalisé des sections identique à l'original (seuls écarts listés ci-dessus) + captures avant/après clair/sombre/mobile comparées. Commit.

### Task 3: Socle admin
**Files:** Create `admin/index.html`, `admin/admin.css`, `admin/js/{config,github,store,ui,app}.js`, `robots.txt`.
- [ ] Connexion token (vérif. `/user` = `yacineberkani`, accès dépôt), déconnexion manuelle/30 min/401, anti-iframe, CSP.
- [ ] Layout sidebar + topbar + routeur hash + thème, toasts, modale, Tableau de bord. Test E2E (API mockée) connexion OK/KO. Commit.

### Task 4: Édition, médias, aperçu, publication, historique
**Files:** Create `admin/js/form.js` (rendu de champs déclaratifs), `admin/js/views/*.js`, `admin/js/images.js`; tests `tests/images.test.mjs`, `tests/github.test.mjs`, E2E admin.
- [ ] Vues : Profil, Expériences, Projets, Compétences, Formations, Certifications, Contenu (stats, textes, contact, sections) ; tri ↑/↓ + glisser, suppression confirmée, validation.
- [ ] Images : signature JPEG/PNG/WebP, WebP max 1600/800 px, nom `slug-hash8.webp`.
- [ ] Publication atomique (blobs/tree/commit/ref sans force), conflit 422, suivi déploiement, historique + restauration, export/import JSON. Commit.

### Task 5: Sécurité, tests, docs
- [ ] Tests XSS E2E (payloads dans chaque type de champ → aucun script exécuté sur le site).
- [ ] `docs/admin.md` (création du token pas à pas, usage, restauration), README, workflow GitHub Actions gratuit `node --test`. Commit, push.
