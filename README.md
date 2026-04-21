# 🚀 Portfolio — Yacine Berkani | ML Engineer

Site portfolio personnel moderne et responsive, construit en **HTML5 / CSS3 / JavaScript vanilla**, sans framework lourd.

> 💡 Conçu pour mettre en valeur 5 ans d'expérience en Machine Learning, MLOps, LLM/RAG et Cloud GCP.

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
- 📨 **Formulaire de contact** avec ouverture du client mail natif
- 🔄 **Scroll progress bar** + bouton "back to top"
- 📈 **SEO friendly** : meta tags, structure sémantique HTML5

---

## 📂 Structure du projet

```
portfolio/
├── index.html              # Page principale (toutes les sections)
├── css/
│   └── style.css           # Styles globaux + thèmes + responsive
├── js/
│   └── script.js           # Logique : nav, thème, animations, projets, form
├── assets/
│   ├── images/
│   │   └── profile.jpg     # Photo de profil
│   └── icons/              # Icônes personnalisées (si besoin)
└── README.md               # Ce fichier
```

---

## 🚀 Lancer le projet

### Option 1 : Ouvrir directement

Double-cliquez sur `index.html`.
⚠️ Certains navigateurs limitent l'accès aux fichiers locaux — préférez l'option 2.

### Option 2 : Serveur local (recommandé)

**Avec Python :**
```bash
cd portfolio
python3 -m http.server 8000
```
Puis ouvrez [http://localhost:8000](http://localhost:8000)

**Avec Node.js (si vous avez `npx`) :**
```bash
cd portfolio
npx serve .
```

**Avec VS Code :** installez l'extension **Live Server**, clic droit sur `index.html` → *Open with Live Server*.

---

## 🌐 Déploiement

Le site est 100% statique — déployable gratuitement sur :

- **GitHub Pages** : poussez le contenu du dossier `portfolio/` sur une branche `gh-pages`
- **Netlify** : glissez-déposez le dossier `portfolio/` sur [app.netlify.com](https://app.netlify.com)
- **Vercel** : `vercel` depuis le dossier racine
- **Cloudflare Pages** : connectez votre repo GitHub

---

## 🎨 Personnalisation

### Changer les couleurs
Ouvrez `css/style.css` et modifiez les variables CSS dans `:root` et `[data-theme="dark"]` :

```css
:root {
    --accent-primary: #6366f1;   /* couleur principale */
    --accent-secondary: #8b5cf6; /* couleur secondaire */
    --accent-tertiary: #ec4899;  /* couleur d'accentuation */
}
```

### Ajouter / modifier un projet
Éditez le tableau `projects` dans `js/script.js` :

```js
{
    title: 'Nom du projet',
    description: 'Description concise...',
    category: 'ml',             // ml | llm | data | web
    categoryLabel: 'Machine Learning',
    icon: 'fa-brain',           // icône FontAwesome
    tags: ['Python', 'TensorFlow'],
    date: 'Avril 2026',
    link: 'https://github.com/...'
}
```

### Modifier les compétences
Directement dans `index.html`, section `#skills`.

### Changer la photo de profil
Remplacez `assets/images/profile.jpg` par votre photo (format carré recommandé, min. 400×400px).

---

## 🛠 Technologies utilisées

| Catégorie | Stack |
|-----------|-------|
| Markup | HTML5 sémantique |
| Style | CSS3 custom properties, Grid, Flexbox |
| Scripts | JavaScript ES6+ vanilla |
| Icônes | [Font Awesome 6.5](https://fontawesome.com/) |
| Polices | [Inter](https://fonts.google.com/specimen/Inter) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |
| Animations | [AOS (Animate On Scroll)](https://michalsnik.github.io/aos/) |

**Aucune dépendance backend** — le formulaire de contact utilise `mailto:`.

---

## 📬 Contact

- 📧 Email : [yacineberkani32@gmail.com](mailto:yacineberkani32@gmail.com)
- 💼 LinkedIn : [Yacine Berkani](https://www.linkedin.com/in/yacine-berkani-a66189244/)
- 🐙 GitHub : [@yacineberkani](https://github.com/yacineberkani)

---

## 📜 Licence

MIT License — libre d'utilisation et d'adaptation.

Fait avec ❤️ et beaucoup de ☕ par **Yacine Berkani**.
