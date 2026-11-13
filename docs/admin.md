# Back-office du portfolio — guide d'utilisation

Le back-office permet de modifier **tout le contenu** du portfolio (profil, photo, expériences, projets, compétences, formations, certifications, statistiques, textes, contact, sections visibles) sans toucher au code.

- **Adresse :** <https://yacineberkani.github.io/admin/>
- **Coût :** 0 €. Tout repose sur GitHub (dépôt, API, GitHub Pages) : aucun serveur, aucune base de données, aucun abonnement.

---

## 1. Créer son token GitHub (une fois tous les 90 jours)

Le back-office s'authentifie avec un **token « fine-grained »** limité au seul dépôt du portfolio.

1. Ouvrez <https://github.com/settings/personal-access-tokens/new> (GitHub › Settings › Developer settings › Personal access tokens › **Fine-grained tokens** › *Generate new token*).
2. **Token name :** `Admin portfolio`.
3. **Expiration :** 90 jours (recommandé).
4. **Repository access :** *Only select repositories* → choisissez **`yacineberkani/yacineberkani.github.io`** uniquement.
5. **Permissions › Repository permissions :**
   - **Contents : Read and write** (obligatoire) ;
   - *Metadata : Read-only* (ajouté automatiquement) ;
   - rien d'autre.
6. Cliquez sur **Generate token**, puis copiez la valeur (`github_pat_…`).
7. Rangez-la dans votre **gestionnaire de mots de passe** (1Password, Bitwarden, trousseau…). GitHub ne la réaffichera plus.

> ⚠️ Ne collez jamais ce token dans un fichier du projet, un email ou une conversation. Si cela arrive : GitHub › Settings › Personal access tokens › **Revoke**, puis créez-en un nouveau.

Les tokens « classiques » (`ghp_…`) sont refusés : ils ne peuvent pas être limités à un seul dépôt.

---

## 2. Se connecter

1. Ouvrez `/admin/` et collez le token.
2. Le back-office vérifie que le token appartient bien au compte **yacineberkani** et qu'il a accès au dépôt.
3. Le token reste **uniquement en mémoire** le temps de la session. Il n'est enregistré nulle part : ni dans le navigateur (`localStorage`, `sessionStorage`, cookies), ni dans l'URL, ni dans un fichier.

Conséquences :

- recharger la page ou ouvrir un nouvel onglet demande de recoller le token ;
- la session se ferme automatiquement après **30 minutes d'inactivité** ;
- le bouton de déconnexion se trouve en bas de la barre latérale.

Votre **brouillon**, lui, est conservé sur l'appareil : vous le retrouvez à la reconnexion.

---

## 3. Modifier le contenu

| Page | Ce qu'on y gère |
|---|---|
| **Tableau de bord** | Chiffres clés, état du brouillon, dernières publications, date d'expiration du token |
| **Profil** | Photo, prénom, nom, titre, années d'expérience, disponibilité, titres animés, présentation, badges autour de la photo, biographie, informations clés |
| **Expériences** | Poste, entreprise, période, missions, technologies, résultats chiffrés ; ordre d'affichage |
| **Projets** | Titre, description, image, vidéo, technologies, filtre, liens GitHub / démo / documentation, mise en avant ; filtres de la grille |
| **Compétences** | Catégories (Data Science, IA générative, LLMOps, Cloud, DevOps…) et technologies, avec niveau optionnel |
| **Formations & certifications** | Diplômes, établissements, années ; certifications, organismes, dates, liens de vérification |
| **Contenu général** | Sections visibles ou masquées, titres et sous-titres, statistiques, coordonnées et liens professionnels, titre et description pour Google |
| **Médias** | Images du dépôt ; suppression des images inutilisées |
| **Publication** | Publier, abandonner le brouillon, historique et restauration, export et import JSON |

Pour chaque liste, vous pouvez :

- **ajouter** (bouton en haut à droite) ;
- **modifier** (clic sur la ligne) ;
- **dupliquer** ;
- **supprimer** (avec une confirmation) ;
- **réordonner** (glisser-déposer, ou flèches ↑ ↓).

**Mise en forme des textes :** `**gras**` et `==surligné==` (couleur d'accent du site). Le HTML n'est pas accepté, c'est voulu pour la sécurité.

**Icônes :** noms Font Awesome, par exemple `fas fa-rocket` ou `fab fa-github`. La liste est sur <https://fontawesome.com/search?ic=free>.

**Images :** JPEG, PNG ou WebP, 10 Mo maximum. Elles sont automatiquement redimensionnées (1600 px, ou 800 px pour la photo de profil), converties en WebP et débarrassées de leurs métadonnées (position GPS…).

Chaque **Enregistrer** met à jour le **brouillon**, pas le site. Une pastille « N modifications non publiées » indique ce qui est en attente.

---

## 4. Prévisualiser puis publier

1. **Aperçu** (en haut à droite) ouvre votre **vrai portfolio** avec le brouillon (`/?preview=1`). Seul votre navigateur le voit, avec un badge « Aperçu ».
2. **Publier** : toutes les modifications sont envoyées en **un seul commit** sur GitHub.
3. GitHub Pages met le site à jour en **1 à 2 minutes**. L'admin l'indique par « Mise en ligne… » puis « En ligne ✓ ».

Bonnes pratiques :

- **regroupez vos modifications** : GitHub Pages limite à une dizaine de déploiements par heure ;
- si le contenu a été modifié ailleurs entre-temps (autre appareil, modification du code), l'admin vous prévient au lieu d'écraser ce travail.

---

## 5. Sauvegarde et restauration

- **Historique :** chaque publication est une version (un commit Git). Page *Publication* › *Historique des versions* › **Restaurer**. La version choisie est chargée dans le brouillon ; prévisualisez, puis publiez.
- **Export :** *Publication* › **Exporter le brouillon (JSON)** télécharge une copie complète de votre contenu.
- **Import :** **Importer un JSON** remplace le brouillon par un export précédent. Le fichier est vérifié avant l'import.
- Les images ne sont jamais supprimées automatiquement : une ancienne version restaurée retrouve donc ses images. Supprimez manuellement les images inutilisées depuis *Médias* si vous le souhaitez.

---

## 6. Sécurité : ce qui est en place

- Token « fine-grained » limité à un dépôt et à la seule permission *Contents*, conservé en mémoire uniquement, déconnexion automatique.
- Contrôle du propriétaire du token (`yacineberkani` uniquement).
- Back-office sans aucun script tiers. Une politique CSP stricte n'autorise que les connexions vers `api.github.com`. Le back-office refuse de s'afficher dans une iframe, et n'est pas indexé (`noindex`, `robots.txt`).
- Tout le contenu est **échappé** à l'affichage : aucun texte saisi ne peut injecter de HTML ou de JavaScript dans le portfolio. Les liens sont limités à `https://` et `mailto:`.
- Le contenu est validé à la saisie **et** avant chaque publication. Les images sont contrôlées par leur signature binaire, et le SVG est refusé.
- Publication sans écrasement forcé : un conflit est toujours signalé.

## 7. Limites à connaître

- **Délai de mise en ligne** de 1 à 2 minutes (build GitHub Pages).
- **Reconnexion** à chaque rechargement : c'est le prix d'un token jamais stocké.
- **Pas de serveur** : la seule barrière côté serveur est GitHub lui-même (droits du token, mise à jour non forcée de la branche).
- **Contenu public** : `data/content.json` est public, comme le dépôt. N'y mettez rien de confidentiel.
- **Même origine** : tous vos sites GitHub Pages (`yacineberkani.github.io/<autre-projet>`) partagent l'origine du back-office. N'y hébergez jamais de code tiers non maîtrisé.
- **Extensions de navigateur** : une extension malveillante peut lire ce qui est saisi dans une page. Pour l'admin, privilégiez un profil de navigateur sans extensions.
- **Contenu affiché par JavaScript** : il est généré au chargement de la page. Google l'interprète correctement, et le titre et la description restent écrits en dur dans `index.html` (mis à jour à chaque publication).

---

## 8. Pour les développeurs

```
index.html, css/style.css     → design du portfolio (inchangé)
js/render.js                  → contenu JSON → HTML (fonctions pures, échappement)
js/script.js                  → chargement du contenu + animations du site
data/content.json             → TOUT le contenu (source unique)
admin/                        → back-office (HTML/CSS/JS, modules ES, sans build)
  js/github.js                → API GitHub ; le token ne vit que dans ce module
  js/schema.js                → validation du contenu
  js/publish.js               → préparation des fichiers + commit unique
tests/*.test.mjs              → tests unitaires (node --test)
tests/e2e/admin.e2e.mjs       → scénario complet, API GitHub simulée
scripts/snapshot.mjs          → captures + HTML rendu, pour vérifier qu'un changement ne modifie pas l'affichage
```

Lancer le site et l'admin en local :

```bash
python3 -m http.server 8000
```

Le site est alors sur `http://localhost:8000/` et l'admin sur `http://localhost:8000/admin/`.

> En local, l'admin publie **réellement** sur GitHub si vous vous connectez avec votre token.

Lancer les tests unitaires :

```bash
npm test
```

Lancer le scénario de bout en bout (Playwright requis, serveur sur le port 8123) :

```bash
python3 -m http.server 8123 & npm run e2e
```

Ajouter un champ au contenu :

1. l'ajouter dans `data/content.json` ;
2. ajouter sa règle dans `admin/js/schema.js` ;
3. l'afficher dans `js/render.js` (ou `js/script.js`) ;
4. le déclarer dans la page concernée de `admin/js/views/pages.js`.
