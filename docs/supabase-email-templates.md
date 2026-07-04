# Templates email Supabase — LeSkud Beats

Guide pour remplacer l'email générique Supabase Auth par un message propre LeSkud Beats.

## Où coller les templates

1. Ouvre le [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionne ton projet LeSkud Beats
3. Va dans **Authentication** → **Email Templates**
4. Choisis le template **Confirm signup**
5. Colle le **sujet** et le **corps HTML** ci-dessous
6. Enregistre

Pour la version texte : certains projets Supabase n'ont qu'un champ HTML. Si un champ **Plain text** existe, colle aussi la version texte.

---

## Template « Confirm signup »

### Sujet

```
Confirme ton email — LeSkud Beats
```

### Corps HTML

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirme ton email — LeSkud Beats</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0f0f0f;font-family:Inter,Arial,sans-serif;color:#e8e8e8;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f0f;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#171717;border:1px solid #2a2a2a;border-radius:12px;padding:32px 28px;">
            <tr>
              <td style="padding-bottom:8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c9a962;">
                LeSkud Beats
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:16px;font-size:24px;font-weight:600;color:#ffffff;">
                Confirme ton adresse email
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;font-size:15px;line-height:1.6;color:#b8b8b8;">
                Merci d'avoir créé ton compte sur LeSkud Beats. Confirme ton email pour accéder à tes achats, télécharger tes fichiers et retrouver tes licences.
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#c9a962;color:#0f0f0f;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">
                  Confirmer mon email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;font-size:13px;line-height:1.6;color:#8a8a8a;">
                Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #2a2a2a;padding-top:20px;font-size:12px;line-height:1.5;color:#7a7a7a;">
                LeSkud Beats — <a href="mailto:leskud.contact@gmail.com" style="color:#c9a962;text-decoration:none;">leskud.contact@gmail.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

> **Important** : garde exactement la variable Supabase `{{ .ConfirmationURL }}` dans le lien du bouton.

### Version texte simple

```
LeSkud Beats

Confirme ton adresse email

Merci d'avoir créé ton compte sur LeSkud Beats. Confirme ton email pour accéder à tes achats, télécharger tes fichiers et retrouver tes licences.

Confirmer mon email :
{{ .ConfirmationURL }}

Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.

—
LeSkud Beats
leskud.contact@gmail.com
```

---

## Changer l'expéditeur (de « Supabase Auth » vers LeSkud)

Par défaut, Supabase envoie les emails depuis son infrastructure (`noreply@mail.app.supabase.io` ou similaire). **Le template seul ne change pas l'expéditeur.**

Pour un expéditeur personnalisé (ex. `noreply@leskud-beats.com` ou `leskud.contact@gmail.com`), configure un **SMTP personnalisé** :

1. Supabase Dashboard → **Project Settings** → **Authentication**
2. Section **SMTP Settings** → activer **Custom SMTP**
3. Renseigner hôte, port, utilisateur, mot de passe, expéditeur

### Recommandation : Resend

[Resend](https://resend.com) convient bien à LeSkud Beats :

- API simple, bon délivrabilité
- Domaine personnalisé (`leskud-beats.com` ou sous-domaine `mail.leskud-beats.com`)
- Compatible SMTP pour Supabase Auth

**Étapes typiques avec Resend :**

1. Créer un compte Resend
2. Ajouter et vérifier ton domaine (DNS : SPF, DKIM)
3. Générer une clé SMTP ou utiliser les identifiants SMTP Resend
4. Dans Supabase → Custom SMTP :
   - **Host** : `smtp.resend.com`
   - **Port** : `465` (SSL) ou `587` (TLS)
   - **Username** : `resend`
   - **Password** : ta clé API Resend
   - **Sender email** : `noreply@ton-domaine-verifie.com`
   - **Sender name** : `LeSkud Beats`

Sans SMTP personnalisé, le **contenu** de l'email sera LeSkud, mais l'**expéditeur** restera Supabase.

---

## Variables Supabase utiles

| Variable | Usage |
|----------|--------|
| `{{ .ConfirmationURL }}` | Lien de confirmation (obligatoire) |
| `{{ .Email }}` | Email du destinataire |
| `{{ .SiteURL }}` | URL du site configurée dans Supabase |

---

## Checklist après déploiement

- [ ] Créer un compte test sur le site
- [ ] Vérifier le sujet : « Confirme ton email — LeSkud Beats »
- [ ] Vérifier le bouton « Confirmer mon email »
- [ ] Vérifier que le lien de confirmation fonctionne
- [ ] Vérifier l'expéditeur affiché (Supabase ou domaine custom)
- [ ] Tester sur mobile (Gmail, Outlook)
