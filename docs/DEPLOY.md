# Déploiement LeSkud Beats — Vercel + Supabase + Resend

Guide pour mettre le site en production sans casser le flux gratuit par email.

---

## Prérequis

- Compte [Vercel](https://vercel.com)
- Projet Supabase (DB + Storage + Auth)
- Compte [Resend](https://resend.com) avec domaine vérifié
- Domaine custom (ex. `leskudbeats.com`)

---

## 1. Variables d'environnement Vercel

Copier depuis `.env.example`. **Toutes les variables marquées obligatoires doivent être définies sur Vercel** (Settings → Environment Variables).

### Obligatoires en production

| Variable | Exemple | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://leskudbeats.com` | **Sans slash final.** Pas de localhost. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Secret** — jamais côté client |
| `DOWNLOAD_TOKEN_SECRET` | `(openssl rand -base64 48)` | Min. 32 caractères |
| `RESEND_API_KEY` | `re_...` | |
| `RESEND_FROM_EMAIL` | `LeSkud Beats <contact@leskudbeats.com>` | Domaine vérifié Resend |

### Recommandées

| Variable | Défaut | Notes |
|---|---|---|
| `FREE_DOWNLOAD_TOKEN_TTL_SECONDS` | `604800` (7 j) | Expiration liens email |
| `RESEND_TEST_RECIPIENT` | — | Email affiché dans les erreurs mode test |
| `ADMIN_EMAIL` | — | Documentation interne |

### Phase B — Stripe (checkout licences)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publishable (client) |
| `STRIPE_SECRET_KEY` | Secret — Vercel only |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret |

Webhook prod : `https://leskudbeats.com/api/stripe/webhook`  
Events : `checkout.session.completed`

Migration à exécuter : `004_orders_download.sql`

---

## Prochaine étape

- Activer Stripe live + webhook prod
- Email de confirmation post-achat (optionnel)
- Panier multi-licences (v2)

---

## 2. Déploiement Vercel

### Checklist

- [ ] Repo Git connecté à Vercel
- [ ] Framework : **Next.js** (auto-détecté)
- [ ] Build command : `npm run build`
- [ ] Output : default
- [ ] Variables env définies pour **Production** (et Preview si besoin)
- [ ] Domaine custom ajouté (Vercel → Domains)
- [ ] `NEXT_PUBLIC_APP_URL` = URL de prod exacte

### Domaine personnalisé

1. Vercel → Project → Domains → Add `leskudbeats.com` (+ `www` si souhaité)
2. Configurer DNS chez le registrar (A/CNAME selon Vercel)
3. Mettre à jour `NEXT_PUBLIC_APP_URL=https://leskudbeats.com`
4. Redéployer après changement d'env

---

## 3. Supabase

### Auth — Redirect URLs

Dans Supabase → Authentication → URL Configuration :

- **Site URL** : `https://leskudbeats.com`
- **Redirect URLs** :
  - `https://leskudbeats.com/auth/callback`
  - `http://localhost:3000/auth/callback` (dev)

### Storage — Buckets

| Bucket | Public | Contenu |
|---|---|---|
| `previews` | Oui | MP3 tagués (stream + download gratuit) |
| `covers` | Oui | Images cover |
| `beats` | **Non** | MP3/WAV/stems payants |

Vérifier que le bucket `beats` n'est **pas** public.

### Migrations

Exécuter dans l'ordre :

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_storage_setup.sql` (référence policies)
3. `supabase/migrations/003_leads.sql`

### Admin

Promouvoir le compte admin en SQL :

```sql
update public.profiles
set is_admin = true
where email = 'leskud.contact@gmail.com';
```

---

## 4. Resend — passage en production

### Depuis `onboarding@resend.dev`

1. Resend → Domains → Add Domain `leskudbeats.com`
2. Ajouter les enregistrements DNS (SPF, DKIM)
3. Attendre vérification
4. Sur Vercel : `RESEND_FROM_EMAIL=LeSkud Beats <contact@leskudbeats.com>`
5. Redéployer

### Test

- Envoyer un téléchargement gratuit depuis le site prod
- Vérifier que le lien email pointe vers `https://leskudbeats.com/download/beat/...?token=...`
- Vérifier que le MP3 se télécharge

---

## 5. Liens de téléchargement gratuits (tokens HMAC)

Les emails contiennent un lien signé :

```
/download/beat/{beatId}?token=...&exp=...&email=...
```

- Signé avec `DOWNLOAD_TOKEN_SECRET`
- Expire après `FREE_DOWNLOAD_TOKEN_TTL_SECONDS` (défaut 7 jours)
- Sans token valide → page « Lien invalide » + API 403

**Important :** ne jamais réutiliser le même `DOWNLOAD_TOKEN_SECRET` entre dev et prod.

---

## 6. FFmpeg / uploads admin (attention Vercel)

L'upload admin génère les previews taguées via **FFmpeg** (`ffmpeg-static`).

Risques sur Vercel serverless :

- Timeout (10s Hobby / 60s Pro)
- Taille body limit (~4.5 Mo sur fonctions)

**Recommandation court terme :** uploader les beats depuis l'environnement local, ou désactiver le watermark en prod (Phase ultérieure).

---

## 7. Vérifications post-déploiement

```bash
# Build local (avec .env.local)
npm run build
npm run start
```

### Tests manuels prod

- [ ] Page d'accueil + catalogue
- [ ] Lecture audio preview
- [ ] Téléchargement gratuit → email reçu
- [ ] Lien email → téléchargement MP3 tagué
- [ ] Lien expiré / modifié → erreur 403
- [ ] Login / register (redirect Supabase)
- [ ] Admin `/admin` (compte is_admin)
- [ ] Favicon logo LeSkud

---

## 8. Dépannage

| Problème | Cause probable | Fix |
|---|---|---|
| Liens email → localhost | `NEXT_PUBLIC_APP_URL` manquant | Définir sur Vercel + redeploy |
| Email non envoyé | Clé Resend / domaine | Vérifier Resend dashboard |
| Lien download 403 | Token expiré ou secret changé | Renvoyer email |
| 500 au build | Env Supabase manquantes | Vérifier variables Vercel |
| Upload admin timeout | FFmpeg sur Vercel | Upload en local |

---

## Prochaine étape — Phase B Stripe

Voir le plan CTO : checkout, webhook, orders, téléchargements payants, page Mes achats.

**Implémenté :** checkout licence unique, webhook, téléchargements signés, `/account`, exclusive → `sold_exclusive`.
