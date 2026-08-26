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

## Design

Le systeme visuel vient d'une maquette Google Stitch, adaptee et rendue
coherente sur les 5 apps. Il tient en trois idees :

**Profondeur tactile.** Pas d'ombres flottantes : les boutons ont une ombre
pleine de 4px dessous qui se comprime a 2px quand on appuie, comme une
touche mecanique. Les cartes sont des tuiles a 20px de rayon avec un filet
de 1px ; tout ce qui est actionnable est a 16px.

**Deux themes, un seul jeu de tokens.** « Trackz » en clair, « Obsidian Zen »
en sombre, suivant le reglage du systeme. Aucun composant ne contient de
couleur en dur : tout passe par des variables `--color-*` redefinies dans
`app/globals.css`.

**Cinq accents tenus.** Chaque module a sa couleur, mais toutes sont
calibrees dans la meme bande de clarte et de saturation (OKLCH, L 0.52-0.58,
C 0.11-0.20) : elles se distinguent par la teinte, pas par le volume. Le
violet reste le plus chromatique parce qu'il porte la marque.

> Piege a connaitre : les classes `.theme-*` redefinissent directement les
> variables `--color-accent*`. Ne pas reintroduire d'indirection du type
> `--color-accent: var(--accent)` declaree sur `:root` — une custom property
> est resolue la ou elle est declaree, les descendants heriteraient de la
> valeur deja calculee et tous les modules seraient violets.

Les icones d'interface sont des SVG inline (`components/Icon.tsx`) et non une
police d'icones : une police qui ne charge pas affiche le nom du glyphe en
toutes lettres. Les emojis, eux, servent a identifier un contenu (une
matiere, un domaine), jamais un controle.

## Stack

- **Next.js 15** (App Router, TypeScript) — un dossier par app sous `app/`
- **Supabase** — auth (email/mot de passe + lien magique), Postgres, RLS
- **Tailwind CSS v4** — deux themes et cinq accents par variables CSS
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

## L'assistant

Un assistant Claude est branche sur l'app (`/assistant`, bouton flottant sur
tous les ecrans). Il sert surtout aux ecoles : chercher des formations,
verifier les deadlines, trier les dossiers, preparer les documents.

**Ce qu'il peut faire** — lire et creer des dossiers d'ecole, cocher ou
ajouter des documents, deposer un brouillon dans les notes d'un dossier,
lire les matieres et ce qu'il reste a cocher aujourd'hui. Il a aussi la
recherche web cote Anthropic, indispensable pour les dates limites.

**Ce qu'il ne peut pas faire** — sortir de tes donnees. L'Edge Function
`assistant` parle a Supabase avec **ton JWT**, pas avec la cle service
role : il passe par la meme RLS que l'app. Meme si le modele se trompe
d'identifiant, il ne peut rien lire ni ecrire chez quelqu'un d'autre.

La conversation est stockee dans `assistant_threads` / `assistant_messages`,
avec les blocs de contenu bruts : l'assistant se souvient de ce qu'il a
cherche et modifie, pas seulement de ce qu'il a dit.

**Voix** — dictee et lecture a voix haute via l'API Web Speech du
navigateur. Aucun service tiers, rien qui sorte de l'appareil pour ca.

### Secret a renseigner

| Ou | Cle | Valeur |
| --- | --- | --- |
| Edge Function secrets | `ANTHROPIC_API_KEY` | ta cle [console.anthropic.com](https://console.anthropic.com) |

Le modele est `claude-opus-5` avec la reflexion adaptative et la recherche
web. Deux reglages a connaitre dans `supabase/functions/assistant/index.ts`
si les reponses sont trop lentes : `MAX_TOOL_ROUNDS` (8 par defaut) et
l'ajout eventuel de `output_config: { effort: "medium" }`.

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
    assistant/        Edge Function de l'assistant
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
