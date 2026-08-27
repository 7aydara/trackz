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

Interface **sombre uniquement**, dans l'esprit d'Apple et de Netflix :
fonds profonds, typographie qui porte la hierarchie, et une seule couleur.

**Un accent, pas cinq.** Le rouge du sceau (`#e5323f`) est reserve a ce
qu'on touche : boutons d'action, cases cochees, onglet actif. Tout le reste
vit en gris. Les cinq modules ne se distinguent plus par des aplats mais par
une teinte tres sourde (`--color-module`) posee sur leur pastille d'icone,
leur anneau de progression et le trait de l'onglet actif — un reperage sans
carnaval.

**Trois niveaux de fond.** `ground` (#0a0a0c) pour la page, `surface` pour
les cartes, `raised` pour les champs et les creux. En sombre la profondeur
vient de la clarte du fond et d'un filet fin, jamais d'une ombre portee :
une ombre noire sur fond noir ne se voit pas.

**Le mercure.** Un materiau d'argent liquide habille les anneaux de
progression, les grands chiffres, les titres de section, l'arete des cartes
et le trait de l'onglet actif. Il **complete** le rouge, il ne le remplace
pas : aucun bouton ni aucune case a cocher n'est en metal, parce que c'est
le rouge qui dit ou l'on appuie.

Le chrome ne se lit pas a la couleur mais a l'alternance brutale de bandes
claires et sombres — un degrade gris doux donne du plastique. D'ou les onze
arrets de `--mercury`, qui passent du blanc pur au gris profond sur des
transitions courtes.

Deux precautions : l'arete des cartes n'est **pas** animee (une page porte
jusqu'a huit cartes, et huit degrades qui coulent en continu coutent de la
batterie pour rien), et le degrade de l'anneau est declare une seule fois
dans `app/layout.tsx` plutot que duplique a chaque instance.

**Typographie** Manrope, 400 a 800, chiffres tabulaires partout ou des
valeurs s'alignent.

**Ergonomie tactile.** Toute cible fait au moins 44px dans les deux
dimensions — y compris les petites croix de suppression, dont la zone
touchable deborde du glyphe via la classe utilitaire `.tap`. L'acces a
l'assistant est dans l'en-tete et non en bouton flottant : flottant, il se
posait par-dessus la case a cocher de la derniere ligne des listes.

Les icones d'interface sont des SVG inline (`components/Icon.tsx`) et non une
police d'icones : une police qui ne charge pas affiche le nom du glyphe en
toutes lettres. Les emojis servent a identifier un contenu (une matiere, un
domaine), jamais un controle ni un titre de section.

## Stack

- **Next.js 15** (App Router, TypeScript) — un dossier par app sous `app/`
- **Supabase** — auth (email/mot de passe + lien magique), Postgres, RLS
- **Tailwind CSS v4** — theme sombre unique, un accent, variables CSS
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
**creer des matieres et des habitudes**, et **cocher a ta place** ce que tu
lui dis avoir fait. Il a aussi la recherche Google integree, indispensable
pour les dates limites.

**Ce qu'il ne peut pas faire** — sortir de tes donnees. L'Edge Function
`assistant` parle a Supabase avec **ton JWT**, pas avec la cle service
role : il passe par la meme RLS que l'app. Meme si le modele se trompe
d'identifiant, il ne peut rien lire ni ecrire chez quelqu'un d'autre.

La conversation est stockee dans `assistant_threads` / `assistant_messages`,
avec les blocs de contenu bruts : l'assistant se souvient de ce qu'il a
cherche et modifie, pas seulement de ce qu'il a dit.

**Voix** — dictee et lecture a voix haute via l'API Web Speech du
navigateur. Aucun service tiers, rien qui sorte de l'appareil pour ca.

### Le modele

L'assistant tourne sur **Gemini 3 Flash**, via l'API REST de Google AI
Studio. Ce choix tient a une seule chose : c'est le seul palier gratuit qui
apporte a la fois l'appel d'outils et la **recherche Google integree**.
Sans recherche web, l'assistant inventerait des dates limites — exactement
ce que son prompt lui interdit.

Deux details de l'API qui ne se devinent pas :

- Gemini 3 attache une `thoughtSignature` a ses appels d'outils et attend
  de la retrouver dans l'historique. Les `parts` sont donc stockees et
  rejouees **telles quelles** ; les reecrire casserait la chaine d'outils.
- Combiner la recherche integree et les outils maison dans le meme appel
  demande `toolConfig.includeServerSideToolInvocations`.

La fonction degrade proprement plutot que de tomber en panne : modele
introuvable → elle demande a la cle la liste de ce qu'elle sait faire et
reprend sur un Flash ; champ refuse → elle retire le drapeau, puis la
recherche, et le repond quand meme. La reponse indique le modele
reellement utilise et si la recherche etait active.

### Secrets a renseigner

| Ou | Cle | Valeur |
| --- | --- | --- |
| Edge Function secrets | `GEMINI_API_KEY` | ta cle [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Edge Function secrets | `GEMINI_MODEL` | *optionnel* — force un modele precis, sinon `gemini-3-flash` |

> **Piege** : activer la facturation sur le projet Google fait disparaitre
> son palier gratuit, definitivement. Cree la cle dans un projet dedie a
> Trackz, sans facturation.

`MAX_TOOL_ROUNDS` (8 par defaut) borne le nombre d'allers-retours d'outils
par question.

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
