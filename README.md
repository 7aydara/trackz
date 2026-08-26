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
`supabase/migrations/` **dans l'ordre** (0001 → 0007). Ils sont rejouables :
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

## Securite des donnees

Chaque table porte un `user_id` et la **Row Level Security** est active dessus :
un utilisateur ne peut lire, ecrire, modifier et supprimer que ses propres
lignes. Les policies sont posees par le helper `public.apply_owner_rls()`
(migration 0001), ce qui garantit les 4 memes regles partout.

Il n'existe aucune route serveur qui contourne la RLS : le front parle
directement a Supabase avec la session de l'utilisateur.

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
supabase/migrations/  schema SQL, une migration par app
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
