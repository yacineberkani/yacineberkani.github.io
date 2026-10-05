/**
 * Cloudflare Worker — formulaire de contact du portfolio.
 *
 * Reçoit le formulaire (JSON) depuis https://yacineberkani.github.io,
 * valide les champs puis envoie l'email via l'API Resend.
 *
 * Secrets / variables (à définir avec `wrangler secret put` — jamais dans le code) :
 *   RESEND_API_KEY    clé API Resend
 *   CONTACT_TO_EMAIL  adresse qui reçoit les messages
 *   CONTACT_FROM      (optionnel) expéditeur, ex. "Portfolio <contact@mondomaine.fr>"
 *                     par défaut "Portfolio <onboarding@resend.dev>"
 */

const ALLOWED_ORIGINS = [
    'https://yacineberkani.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8000'
];

const SECTORS = [
    'Recrutement / RH',
    'ESN / Conseil IT',
    'Startup / Tech',
    'Finance / Banque / Assurance',
    'Santé / Pharma',
    'Industrie / Énergie',
    'Commerce / E-commerce',
    'Recherche / Enseignement',
    'Secteur public',
    'Étudiant',
    'Autre'
];

const SUBJECTS = [
    "Opportunité d'emploi (CDI / CDD)",
    'Mission freelance',
    'Stage / Alternance',
    'Projet ML / IA',
    'LLM / RAG',
    'MLOps / Cloud',
    'Collaboration / Partenariat',
    'Question technique',
    'Autre'
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin) {
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin'
    };
}

function json(body, status, origin) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function clean(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }
        if (request.method !== 'POST') {
            return json({ error: 'Méthode non autorisée.' }, 405, origin);
        }
        if (!ALLOWED_ORIGINS.includes(origin)) {
            return json({ error: 'Origine non autorisée.' }, 403, origin);
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Requête invalide.' }, 400, origin);
        }

        // Honeypot : un robot remplit ce champ caché -> on fait semblant d'accepter
        if (body.website) {
            return json({ ok: true }, 200, origin);
        }

        const data = {
            firstName: clean(body.firstName, 80),
            lastName: clean(body.lastName, 80),
            email: clean(body.email, 160),
            sector: clean(body.sector, 100),
            subject: clean(body.subject, 100),
            message: clean(body.message, 5000)
        };

        if (!data.firstName || !data.lastName) {
            return json({ error: 'Merci d\'indiquer votre prénom et votre nom.' }, 400, origin);
        }
        if (!EMAIL_RE.test(data.email)) {
            return json({ error: 'Adresse email invalide.' }, 400, origin);
        }
        if (!SECTORS.includes(data.sector)) {
            return json({ error: 'Veuillez choisir un secteur d\'activité.' }, 400, origin);
        }
        if (!SUBJECTS.includes(data.subject)) {
            return json({ error: 'Veuillez choisir un sujet.' }, 400, origin);
        }
        if (data.message.length < 10) {
            return json({ error: 'Votre message est trop court.' }, 400, origin);
        }

        if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
            return json({ error: 'Service de contact non configuré.' }, 500, origin);
        }

        const fullName = `${data.firstName} ${data.lastName}`;
        const html = `
            <h2>Nouveau message depuis le portfolio</h2>
            <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif">
                <tr><td><b>Prénom</b></td><td>${escapeHtml(data.firstName)}</td></tr>
                <tr><td><b>Nom</b></td><td>${escapeHtml(data.lastName)}</td></tr>
                <tr><td><b>Email</b></td><td>${escapeHtml(data.email)}</td></tr>
                <tr><td><b>Secteur d'activité</b></td><td>${escapeHtml(data.sector)}</td></tr>
                <tr><td><b>Sujet</b></td><td>${escapeHtml(data.subject)}</td></tr>
            </table>
            <h3>Message</h3>
            <p style="white-space:pre-wrap;font-family:sans-serif">${escapeHtml(data.message)}</p>
        `;
        const text =
            `Nouveau message depuis le portfolio\n\n` +
            `Prénom : ${data.firstName}\nNom : ${data.lastName}\nEmail : ${data.email}\n` +
            `Secteur d'activité : ${data.sector}\nSujet : ${data.subject}\n\n${data.message}`;

        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: env.CONTACT_FROM || 'Portfolio <onboarding@resend.dev>',
                to: [env.CONTACT_TO_EMAIL],
                reply_to: data.email,
                subject: `[Portfolio] ${data.subject} — ${fullName} (${data.sector})`,
                html,
                text
            })
        });

        if (!resendRes.ok) {
            console.error('Resend error', resendRes.status, await resendRes.text());
            return json({ error: 'L\'envoi a échoué, veuillez réessayer plus tard.' }, 502, origin);
        }

        return json({ ok: true }, 200, origin);
    }
};
