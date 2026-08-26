# Trackz — ma suite perso (S6)

Cinq apps, un seul compte, une seule base Supabase :

| App | Route | Accent | Ce qu'elle fait |
| --- | --- | --- | --- |
| 🔥 Habit Tracker | `/tracker` | violet | Vue "aujourd'hui" agregee, streaks, heatmap, habitudes custom |
| 📚 Cours | `/cours` | bleu | Une case par matiere chaque jour, streak par matiere, badges |
| 🎓 Ecoles | `/ecoles` | ambre | Deadlines, checklists de documents, alertes visuelles |
| 💼 Business | `/business` | vert | Clients, projets, factures, revenus du mois |
| 🥋 Kung Fu | `/sport` | rouge | Seances, stances, conditionnement, arbre de progression, Chan |

La page `/` est le hub : elle liste les 5 apps avec un resume live de chacune.

## Stack

- **Next.js 15** (App Router, TypeScript) — un dossier par app sous `app/`
- **Supabase** — auth (email/mot de passe + lien magique), Postgres, RLS
- **Tailwind CSS v4** — themes d'accent par module via variables CSS
- Zero dependance UI : confettis, heatmap, courbes et anneaux sont faits maison

## Mise en route

### 1. Creer le projet Supabase

Sur [supabase.com](https://supabase.com), cree un projet, puis recupere dans
**Project Settings → API** :

- `Project URL`
- la cle `anon` / `publishable`

### 2. Variables d'environnement

```bash
cp .env.example .env.local
```

Puis renseigne :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Appliquer le schema

Dans le **SQL Editor** de Supabase, execute les fichiers de
`supabase/migrations/` **dans l'ordre** (0001 → 0010). Ils sont rejouables :
tu peux les relancer sans casser l'existant.

Avec la CLI Supabase :

```bash
supabase link --project-ref <ref>
supabase db push
```

### 4. Lancer

```bash
npm install
npm run dev
```

Va sur http://localhost:3000, cree ton compte, et c'est parti.

> Pour le lien magique en production, ajoute `https://ton-domaine/auth/callback`
> dans **Authentication → URL Configuration → Redirect URLs**.

## Notifications push

Trackz est une **PWA installable** : ajoutee a l'ecran d'accueil, elle peut
envoyer une notification le soir s'il reste des cases a cocher.

Comment ca marche :

1. `public/manifest.webmanifest` + `public/sw.js` rendent l'app installable
   et lui permettent de recevoir des messages push.
2. En activant le rappel dans `/tracker`, le navigateur cree un abonnement
   Web Push stocke dans `push_subscriptions` (un par appareil, avec son
   fuseau et son heure de rappel).
3. Un cron Postgres appelle l'Edge Function `send-reminders` **toutes les
   heures**. La fonction regarde, pour chaque appareil, s'il est bien
   l'heure locale choisie, compte ce qui reste a cocher, et n'envoie que
   s'il reste quelque chose — au maximum une notification par jour.

### Secrets a renseigner

Genere une paire de cles VAPID (`npx web-push generate-vapid-keys`), puis :

| Ou | Cle | Valeur |
| --- | --- | --- |
| `.env.local` | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | cle **publique** |
| Edge Function secrets | `VAPID_PUBLIC_KEY` | la meme cle publique |
| Edge Function secrets | `VAPID_PRIVATE_KEY` | cle **privee** — jamais dans git |
| Edge Function secrets | `VAPID_SUBJECT` | `mailto:ton@email.com` |
| Edge Function secrets | `CRON_SECRET` | secret partage avec le cron |
| Vault (migration 0009) | `trackz_cron_secret` | la meme valeur que `CRON_SECRET` |

Les secrets d'Edge Function se posent dans **Edge Functions → Secrets** du
dashboard, ou avec `supabase secrets set CLE=valeur`.

La fonction est deployee avec `verify_jwt: false` parce que le cron n'a pas
de JWT ; elle fait sa propre authentification : soit l'en-tete
`x-cron-secret`, soit un JWT utilisateur valide (chemin « notification de
test »). Aucun chemin n'est ouvert sans l'un des deux.

### Sur iPhone

iOS n'autorise le push **que** pour une app ajoutee a l'ecran d'accueil.
Safari → Partager → « Sur l'ecran d'accueil », puis rouvre Trackz depuis
l'icone avant d'activer le rappel. L'app le dit d'elle-meme si tu es dans ce
cas.

## Securite des donnees

Chaque table porte un `user_id` et la **Row Level Security** est active dessus :
un utilisateur ne peut lire, ecrire, modifier et supprimer que ses propres
lignes. Les policies sont posees par le helper `public.apply_owner_rls()`
(migration 0001), ce qui garantit les 4 memes regles partout.

Il n'existe aucune route serveur qui contourne la RLS : le front parle
directement a Supabase avec la session de l'utilisateur. Seule l'Edge
Function `send-reminders` utilise la cle service role — elle tourne cote
serveur, n'est jamais exposee au navigateur, et ne lit que ce qu'il faut
pour compter les cases restantes.

Les fonctions SQL sont durcies (migration 0010) : `search_path` fige, et les
fonctions de trigger ne sont pas appelables en RPC.

## Le jour courant

Les streaks reposent sur "quel jour sommes-nous **pour toi**". Le navigateur
depose son fuseau dans un cookie (`components/TimezoneSync.tsx`) et le serveur
calcule la date avec (`lib/today.ts`). Une habitude cochee a 23 h a Paris tombe
donc bien sur la bonne journee, meme si le serveur tourne en UTC.

## Organisation du code

```
app/
  page.tsx            hub des 5 apps
  login/              connexion, inscription, lien magique
  auth/callback/      echange du code OAuth / magic link
  tracker/            app 1
  cours/              app 2  (+ /cours/[id] fiche matiere)
  ecoles/             app 3
  business/           app 4  (+ /clients /projets /factures)
  sport/              app 5  (+ /progres /arbre /chan)
components/
  AppShell.tsx        cadre commun : theme, en-tete, nav basse
  ui/                 design system partage
lib/
  supabase/           clients navigateur, serveur et middleware
  queries/            agregations (dashboard)
  dates.ts streaks.ts modules.ts today.ts
  business.ts schools.ts kungfu.ts   regles metier par domaine
supabase/
  migrations/         schema SQL, une migration par app
  functions/
    send-reminders/   Edge Function du rappel quotidien
public/
  manifest.webmanifest, sw.js, icons/   la partie PWA
scripts/
  generate_icons.py   regenere les icones (aucune dependance)
```

Chaque app est autonome : modifier `app/business/` ne touche ni au tracker ni
au reste. Ce qui est partage est explicitement dans `components/` et `lib/`.

## Scripts

```bash
npm run dev        # developpement
npm run build      # build de production
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```
