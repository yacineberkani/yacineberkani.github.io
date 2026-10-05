# Backend du formulaire de contact (Resend)

GitHub Pages ne sert que des fichiers statiques : la clé API Resend ne peut pas
être mise dans `js/script.js` (elle serait visible par tout le monde, et l'API
Resend refuse les appels directs depuis un navigateur). Ce petit
**Cloudflare Worker** (gratuit) reçoit le formulaire et envoie l'email via Resend.

## Déploiement (une seule fois)

```bash
cd contact-worker
npx wrangler login                        # connexion à votre compte Cloudflare
npx wrangler secret put RESEND_API_KEY    # collez votre clé Resend (re_...)
npx wrangler secret put CONTACT_TO_EMAIL  # yacineberkani32@gmail.com
npx wrangler deploy
```

`wrangler deploy` affiche l'URL du Worker, par ex.
`https://contact-form.<votre-sous-domaine>.workers.dev`.
Reportez-la dans la constante `CONTACT_ENDPOINT` de `js/script.js`.

## Expéditeur

Sans domaine vérifié sur Resend, l'expéditeur est `onboarding@resend.dev` et
Resend n'envoie qu'à l'adresse du compte Resend — ce qui suffit ici, puisque
c'est vous qui recevez les messages. Avec un domaine vérifié, ajoutez :

```bash
npx wrangler secret put CONTACT_FROM      # ex. Portfolio <contact@mondomaine.fr>
```

Le champ `reply_to` est l'email du visiteur : cliquez « Répondre » dans Gmail
pour lui répondre directement.

## Test local

```bash
npx wrangler dev   # http://localhost:8787
```
