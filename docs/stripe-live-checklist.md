# Checklist Stripe Live — LeSkud Beats

Guide pour activer les **vrais paiements** en production.  
Ne remplace pas la configuration actuelle : à suivre au moment du passage en live.

---

## Prérequis

- Compte Stripe vérifié (identité / activité validée côté Stripe)
- Site déployé sur Vercel avec URL canonique définie
- Webhook test déjà validé en environnement de développement

---

## Variables Vercel (Production)

| Variable | Valeur attendue |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (clé secrète **live**) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` du endpoint **live** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` si utilisée côté client |
| `NEXT_PUBLIC_APP_URL` | URL canonique du site (sans slash final), ex. `https://leskudbeats.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (secret) |
| `R2_*` | Identifiants Cloudflare R2 (fichiers payants) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Si emails transactionnels activés |

**Important :** ne jamais committer les clés live dans le dépôt. Tout passe par les variables d'environnement Vercel.

---

## Vérifications côté code (déjà en place)

- [x] Aucune clé Stripe hardcodée — lecture via `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- [x] Checkout : `success_url` et `cancel_url` basés sur `NEXT_PUBLIC_APP_URL` (`getAppUrl()`)
- [x] Prix Stripe : `currency: "eur"`, `unit_amount` en centimes (TTC affiché sur le site)
- [x] Panier multi-items : `line_items` multiples + metadata `cart_items`
- [x] Commandes créées **uniquement** après webhook `checkout.session.completed` + `payment_status === "paid"`
- [x] Téléchargements : accès seulement si commande `paid` (`/api/orders/download`)
- [x] `/account` : achats liés aux commandes payées en base

---

## Checklist passage Live

### 1. Stripe Dashboard

- [ ] Passer Stripe en **mode Live** (toggle Test/Live)
- [ ] Activer les moyens de paiement souhaités (cartes, etc.)
- [ ] Vérifier que le compte peut recevoir des paiements

### 2. Clés live dans Vercel

- [ ] `STRIPE_SECRET_KEY` = clé secrète live (`sk_live_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = clé publique live (`pk_live_...`) si nécessaire
- [ ] Variables définies pour l'environnement **Production** uniquement (Preview peut rester en test)

### 3. Webhook live

- [ ] Créer un endpoint webhook **live** :  
  `https://<ton-domaine>/api/stripe/webhook`
- [ ] Événement à écouter : `checkout.session.completed`
- [ ] Copier le **Signing secret** live (`whsec_...`)
- [ ] Mettre `STRIPE_WEBHOOK_SECRET` dans Vercel Production

### 4. Déploiement

- [ ] Redéployer Vercel après mise à jour des variables
- [ ] Vérifier que `NEXT_PUBLIC_APP_URL` pointe vers le domaine canonique (pas localhost, pas preview)

### 5. Test achat réel

- [ ] Acheter une licence **MP3** à petit montant (vrai paiement)
- [ ] Vérifier redirection vers `/checkout/success?session_id=...`
- [ ] Vérifier commande **paid** en base Supabase (`orders`)
- [ ] Vérifier téléchargement depuis `/account`
- [ ] Vérifier **Voir ma licence** (certificat)
- [ ] Vérifier email de confirmation si Resend est activé
- [ ] Rembourser depuis Stripe Dashboard si besoin (test)

### 6. Test panier (optionnel mais recommandé)

- [ ] Ajouter 2 licences différentes au panier
- [ ] Payer en une fois
- [ ] Vérifier que les 2 commandes / items sont fulfillés

---

## En cas de problème

| Symptôme | Piste |
|---|---|
| Paiement OK mais pas de commande | Logs Vercel → `/api/stripe/webhook` ; vérifier `STRIPE_WEBHOOK_SECRET` live |
| Erreur au checkout | `STRIPE_SECRET_KEY` live manquante ou invalide |
| Redirect vers mauvaise URL | `NEXT_PUBLIC_APP_URL` incorrect |
| Fichier inaccessible | Commande non `paid` ou licence sans `storage_path` |

---

## Rappel sécurité / vie privée

- Nom public du site : **LeSkud Beats**
- Contact public : **leskud.contact@gmail.com**
- Aucune identité personnelle dans les pages publiques, certificats ou emails transactionnels
