# Studeals — Super-app P2P 18-25 ans

Next.js 15 (App Router) · Supabase (Auth, Postgres, RLS, Realtime, Storage) · Stripe (Connect, Billing, Identity) · Tailwind v4 · PWA.

## Fonctionnalités
| Module | Pages | Détails |
|---|---|---|
| Landing + PWA | `/` | Sélecteur de ville persistant, vidéo d'installation, manifeste, service worker, page hors-ligne |
| Auth + Badge | `/auth/login`, `/auth/verify` | Lien magique email ou OTP SMS. Badge via Stripe Identity (pièce + selfie) ; âge 18-25 lu sur la pièce |
| Marketplace | `/marketplace`, `/new`, `/[id]` | Filtres, recherche, tag « À liquider », photos, position approximative (~100 m) |
| Coloc | catégorie `room_match` | Mise en relation uniquement, avertissements légaux, pas de paiement in-app |
| Séquestre | `/purchases/[id]` | Paiement → fonds bloqués → code 4 chiffres → virement au vendeur |
| Missions + SOS | `/gigs`, `/new`, `/[id]` | Candidatures, choix du worker, paiement bloqué, alertes SOS en temps réel |
| Messagerie | `/messages`, `/messages/[userId]` | Temps réel, non-lus |
| Nightlife | `/nightlife` | Météo des soirées anonyme, check-in, paywall flouté, réductions VIP |
| Litiges | `/purchases/[id]` | « Signaler un problème », fonds gelés, rappel J+7, remboursement auto J+14 |
| Modération | bouton « Signaler » | Annonces, missions, profils ; masquage auto à 3 signalements ; décision motivée (DSA) |
| Admin | `/admin` | Litiges, signalements, bans, bars partenaires et réductions, export DAC7 |
| Notifications | push + email | Push web (SOS, ventes, messages), emails transactionnels via Resend |
| Légal | `/legal/*` | CGU, CGV Studeals+, mentions légales, confidentialité (modèles à compléter) |
| Bars | `/partenaires` | Formulaire de candidature public, validation admin |
| Connexion | en-tête | Fenêtre par-dessus la page : code email/SMS ou mot de passe. On reste sur la page |
| En-tête | toutes les pages | Ville, messages (pastille non lus), ⚙️ Paramètres, avatar avec menu du compte |
| Paramètres | `/settings` | Photo, prénom, ville, email, téléphone, mot de passe, appareils, IBAN, Studeals+, DAC7, notifications, export RGPD, suppression du compte |
| Profil | `/account` | IBAN (Connect), abonnement / résiliation, ventes/achats, notifications, alertes mots-clés |

## Ouvrir dans VS Code
1. Dézippe le dossier, puis dans VS Code : **Fichier > Ouvrir le dossier…** et choisis `studeals`.
2. Accepte l'installation des extensions recommandées (Tailwind, Prettier, ESLint, Supabase, Stripe).
3. Terminal intégré (**Ctrl+ù** ou **Terminal > Nouveau terminal**) :
   ```bash
   npm install
   cp .env.example .env.local   # puis remplis les clés
   npm run dev                  # http://localhost:3000
   ```
   Node.js 20 ou plus est requis (`node -v` pour vérifier).
4. L'onglet **Exécuter et déboguer** propose aussi « Next.js : serveur de dev » et « Stripe : écouter les webhooks ».

## Mise en route
1. `npm install` puis `cp .env.example .env.local`.
2. **Supabase** : appliquer les migrations `0001` à `0004` dans l'ordre.
   - Auth > Email : dans le modèle « Magic Link », afficher le code `{{ .Token }}` (la connexion se fait
     par code à 6 chiffres, sans quitter la page).
   - Auth > Providers > Phone : brancher un fournisseur SMS (Twilio, MessageBird…).
   - Auth > Email : laisser « Secure password change » désactivé (l'ancien mot de passe est déjà vérifié par
     `/api/account/password`).
   - Te nommer admin : `update users set is_admin = true where email = 'toi@mail.fr';`
   - Brancher la livraison des notifications (après déploiement) :
     `insert into app_config values ('notify_url', 'https://ton-domaine/api/notifications/deliver'), ('notify_secret', '<NOTIFY_WEBHOOK_SECRET>');`
   - Auth > Providers : Email (magic link) ; Phone (Twilio ou autre) pour l'OTP SMS.
   - Auth > URL configuration : ajouter `https://ton-domaine/auth/callback`.
3. **Stripe** (mode test d'abord) :
   - Activer Connect (Express, France), Identity, Apple Pay / Google Pay.
   - Créer le produit Studeals+ à 4,99 €/mois → `STRIPE_PRICE_VIP_MONTHLY`.
   - Configurer le portail client (résiliation autorisée).
   - Webhook vers `/api/webhooks/stripe` avec : `payment_intent.succeeded`, `payment_intent.payment_failed`,
     `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`,
     `account.updated`, `identity.verification_session.verified`.
     Pour `account.updated`, cocher aussi « Événements des comptes connectés ».
   - En local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. **Push** : `npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.
   Sur iPhone, le push ne marche que si l'app est ajoutée à l'écran d'accueil (iOS 16.4+).
5. **Emails** : compte Resend, domaine vérifié → `RESEND_API_KEY`, `EMAIL_FROM`.
6. **Cron** : `vercel.json` lance `/api/cron/escrow` chaque jour à 9 h (définir `CRON_SECRET`).
7. Déposer `public/pwa-install.mp4` et `public/pwa-install-poster.jpg`.
8. `npm run dev` puis déploiement Vercel (variables d'env identiques).

## Parcours de test
1. Compte A : connexion → vérification Stripe Identity (en test, choisir un résultat « vérifié ») → ajouter IBAN de test.
2. A publie un bureau à 15 €.
3. Compte B : vérification → achète avec la carte `4242 4242 4242 4242` → voit son code.
4. A ouvre la vente depuis `/account`, tape le code → transaction « Terminé », annonce « Vendu ».

## Sécurité
- RLS sur toutes les tables ; colonnes sensibles (`is_premium`, `is_verified`, Stripe) verrouillées par privilèges colonne.
- Codes de séquestre hachés, lisibles par l'acheteur seul, 5 essais max.
- Double achat simultané : réservation atomique + remboursement automatique du second.
- Anti-pros : 20 annonces actives max par personne.

## Avant la mise en production
- **Documents légaux** : remplir tous les [crochets] de `lib/legal-content.tsx` et faire relire par un avocat
  (plateforme de mise en relation, DSA, RGPD, DAC7, missions rémunérées).
- **Médiateur de la consommation** : adhésion obligatoire pour Studeals+ (ex. CM2C, Medicys).
- **DAC7** : s'inscrire comme opérateur de plateforme auprès de la DGFiP ; export annuel depuis `/admin` ;
  récapitulatif annuel à envoyer à chaque vendeur avant le 31 janvier (art. 242 bis CGI).
- **Bars partenaires** : aucun lieu n'est pré-rempli. Démarcher les bars, les faire candidater sur `/partenaires`,
  signer un accord écrit (offre, durée, droit d'usage du nom et du logo), puis valider dans `/admin`.
- Lydia n'est pas proposé par Stripe : seuls CB, Apple Pay et Google Pay sont actifs.
# studeals
