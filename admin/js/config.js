// Configuration du back-office. Aucune donnée secrète ici : le token GitHub
// est saisi à chaque session et n'existe qu'en mémoire (voir github.js).
export const OWNER = 'yacineberkani';
export const REPO = 'yacineberkani.github.io';
export const BRANCH = 'main';
export const SITE_URL = 'https://yacineberkani.github.io/';

export const CONTENT_PATH = 'data/content.json';
export const IMAGE_DIRS = ['assets/images', 'assets/images/profile', 'assets/images/projects'];

// Brouillon local (contenu uniquement, jamais le token) — lu par le site en mode ?preview=1.
export const DRAFT_KEY = 'portfolio-admin-draft';
export const IDLE_MINUTES = 30;
