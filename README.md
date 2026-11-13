# 🚀 Portfolio — Yacine Berkani | ML Engineer

Site portfolio personnel moderne et responsive, construit en **HTML5 / CSS3 / JavaScript vanilla**, sans framework lourd.

> 💡 Conçu pour mettre en valeur mon expertise en Machine Learning, MLOps, LLM/RAG et Cloud GCP.

---

## ✨ Fonctionnalités

- 🎨 **Design moderne** inspiré des meilleures pratiques UI/UX 2026
- 🌓 **Mode sombre / clair** avec persistance (localStorage + détection préférence système)
- 📱 **100% responsive** — mobile-first avec breakpoints adaptatifs (1024px, 768px, 480px)
- 🎬 **Animations fluides** :
  - AOS (Animate On Scroll) pour les apparitions au scroll
  - Typing effect sur le Hero
  - Compteurs animés pour les statistiques
  - Curseur personnalisé sur desktop
  - Shapes flottantes en background
  - Micro-interactions sur tous les éléments interactifs
- ⚡ **Performances** : CSS et JS minifiables, lazy-loading des ressources non critiques
- ♿ **Accessibilité** : labels ARIA, contraste WCAG AA, navigation clavier
- 🎯 **Filtres dynamiques** sur les projets (ML, LLM/RAG, Data, Web)
- 📨 **Formulaire de contact** (prénom, nom, email, secteur d'activité, sujet obligatoires) envoyé par email via [Resend](https://resend.com) — backend dans `contact-worker/`
- 🔄 **Scroll progress bar** + bouton "back to top"
- 📈 **SEO friendly** : meta tags, structure sémantique HTML5

---

## 🛠️ Back-office (administration du contenu)

Tout le contenu du site (profil, photo, expériences, projets, compétences, formations, certifications, statistiques, contact, sections visibles) se gère depuis **[/admin/](https://yacineberkani.github.io/admin/)**, sans toucher au code :

- modification dans un **brouillon**, **aperçu** sur le vrai portfolio, puis **publication** en un clic : l'admin crée un commit, et GitHub Pages met le site à jour en 1 à 2 minutes ;
- **historique** des versions avec restauration, export et import JSON ;
- authentification par **token GitHub fine-grained** limité à ce dépôt et gardé en mémoire uniquement ;
- 100 % gratuit : ni serveur, ni base de données, ni abonnement.

👉 Guide complet, avec la création du token pas à pas : **[docs/admin.md](docs/admin.md)**

---

## 📂 Structure du projet

```
portfolio/
├── index.html              # Structure de la page (le contenu est injecté depuis data/content.json)
├── css/style.css           # Styles globaux + thèmes + responsive
├── js/
│   ├── render.js           # Contenu JSON → HTML (fonctions pures, échappement)
│   └── script.js           # Chargement du contenu, nav, thème, animations, projets, formulaire
├── data/content.json       # 📝 TOUT le contenu du site (modifié par le back-office)
├── admin/                  # 🔐 Back-office (HTML/CSS/JS vanilla, sans build)
├── assets/images/          # Photos (profile/ et projects/ pour les images importées)
├── contact-worker/         # Backend du formulaire de contact (Cloudflare Worker + Resend)
├── tests/                  # Tests unitaires (npm test) et E2E (npm run e2e)
└── docs/                   # Guide du back-office, conception et plan
```

```bash
python3 -m http.server 8000
```

Le site est alors sur http://localhost:8000 et l'admin sur http://localhost:8000/admin/.

```bash
npm test
```

Lance les tests unitaires (Node 22, aucune dépendance).

---

https://yacineberkani.github.io/
