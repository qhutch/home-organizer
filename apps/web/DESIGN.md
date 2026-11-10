# Design system Hestia

Base de tout nouvel écran ou composant. Les valeurs vivent dans `src/app/globals.css`
(jetons `@theme` et utilitaires `@utility`) et `src/lib/ui/features.ts`.
**Règle : quand un style change à un endroit, il change ici et partout.**
Version visuelle (aperçus des composants) : https://claude.ai/artifact/Wn3MzFtsFpg68n5vKmd1r6 — à mettre à jour en même temps.

## Ambiance

Grandes cartes de couleur pleine aux coins très arrondis, empilées sur un fond crème.
Gros titres et gros chiffres, boutons en pilule (pleins ou à contour). Calme, chaleureux, lisible.

## Couleurs

Palette d'origine : pistachio `#C1BC6B`, moss `#656038`, dusty pink `#DC9EAB`,
coconut `#E0D4C8`, mandarine `#C07937`. Chaque paire texte/fond atteint 4,5:1.

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `page` | `#F5EFE7` | fond de page |
| `surface` | `#FCF9F4` | cartes, champs, texte clair sur couleur foncée |
| `coconut` | `#E0D4C8` | survols, zones discrètes |
| `line` | `#D3C4B4` | bordures |
| `ink` | `#2E2C18` | texte principal, bouton principal |
| `ink-muted` | `#5E5A33` | texte secondaire |
| `ink-faint` | `#9C9679` | exemples dans les champs vides (placeholder), plus clairs pour ne pas faire « déjà rempli » |
| `moss` / `moss-dark` | `#656038` / `#4E4A2A` | titre du calendrier ; survol du bouton principal |
| `pistachio` / `-soft` / `-deep` | `#C1BC6B` / `#E9E6C3` / `#5C5A1F` | sélection, fonds doux, texte de succès |
| `mandarine` / `-soft` / `-deep` | `#C07937` / `#F3DCC4` / `#8F531C` | décor ; fonds doux et titre des courses |
| `pink` / `-soft` / `-deep` | `#DC9EAB` / `#F4DDE2` / `#8E3F52` | fonds doux et titre des recettes ; texte de suppression |

**Palette d'automne des cartes pleines** : le texte d'une carte, titre et détails, prend la version foncée de sa couleur (`-ink`, au moins 4,5:1) ; `-art`, un ton plus sombre que la carte, sert à la grande icône.

| Jeton | Valeur | `-ink` | Carte |
| --- | --- | --- | --- |
| `citrouille` | `#D9893F` | `#4F2B0A` | Courses |
| `olive` | `#A39E5E` | `#37351D` | Calendrier |
| `rose` | `#DE8C9C` | `#6F192A` | Recettes |
| `canard` / `-soft` / `-deep` | `#6BA3A0` / `#DCEAE6` / `#2F5E5B` | `#1F3635` | Travaux |
| `moutarde` / `-soft` / `-deep` | `#D3A63E` / `#F3E6C4` / `#6B5114` | `#533E0D` | Documents |
| `prune` / `-soft` / `-deep` | `#BE819C` / `#F1E0E7` / `#7A3F5A` | `#462031` | Photos |

### Une couleur par fonctionnalité (`FEATURES`)

Chaque carte pleine écrit son titre et ses détails dans la version foncée de sa propre couleur (ton sur ton). La grande icône de fond (`art`) est un ton plus sombre que la carte.

| Fonctionnalité | `text` (titre de page) | `fill` (carte pleine, action rapide) | `soft` (éléments de la page) |
| --- | --- | --- | --- |
| Courses | `text-mandarine-deep` | `bg-citrouille text-citrouille-ink` | `bg-mandarine-soft` |
| Calendrier | `text-moss` | `bg-olive text-olive-ink` | `bg-pistachio-soft` |
| Recettes | `text-pink-deep` | `bg-rose text-rose-ink` | `bg-pink-soft` |
| Travaux | `text-canard-deep` | `bg-canard text-canard-ink` | `bg-canard-soft` |
| Documents | `text-moutarde-deep` | `bg-moutarde text-moutarde-ink` | `bg-moutarde-soft` |
| Photos | `text-prune-deep` | `bg-prune text-prune-ink` | `bg-prune-soft` |

Toujours passer par `FEATURES` plutôt que réécrire les classes.

## Typographie

- **Titres** : Space Grotesk 600, interlettrage -0,02em (`h1`, `h2`, `font-display`, `tile-title`).
- **Texte** : DM Sans 400/500.
- Échelle : titre de page `text-4xl` · titre de carte `tile-title` (24px, 30px en en-tête) ·
  titre de section `font-display font-semibold text-lg` · texte `text-sm` · intitulé `eyebrow` (12px, capitales).
- Gros chiffres : `font-display font-semibold text-6xl leading-[0.85]`.

## Composants

| Composant | Où | Usage |
| --- | --- | --- |
| `tile` + `tile-title` | utilitaires CSS | grande carte de couleur (accueil) |
| `PageHeader` | `components/ui/PageHeader.tsx` | en-tête très discret d'une page : l'icône dessinée de la fonctionnalité (`FeatureIcon`, 32px) puis son titre, tous deux dans la couleur de la fonctionnalité (`FEATURES.<id>.text`) ; on le touche pour revenir à la page d'accueil de la fonctionnalité, sans filtres |
| `AppHeader` | `components/ui/AppHeader.tsx` | logo Hestia sur toutes les pages, il ramène à l'accueil ; icône Réglages (roue dentée) sur l'accueil seulement |
| `ActionBar` | `components/ui/ActionBar.tsx` | barre du bas d'un onglet, qui réunit la plupart de ses actions : saisie d'un article en Courses, avec le + dans la même pilule qui n'apparaît qu'une fois le nom commencé (comme pour les ingrédients d'une recette) ; en Recettes, une recherche compacte en bas à gauche et l'ajout à part à droite (rond plein) ; pendant la saisie, la recherche prend toute la barre et le + s'efface, il revient quand on quitte le champ ; Mois/Semaine et ajout en Calendrier. Des actions liées partagent une pilule (`barGroup`) ; sans lien entre elles, elles sont séparées (`detached`). Elle remonte au-dessus du clavier |
| `FeatureArt` | `components/ui/FeatureArt.tsx` | grande icône au fond d'une carte de l'accueil, un ton plus sombre que la carte (`FEATURES.<id>.art`), coupée par le bord. Placée là où il reste de la place : à côté du chiffre sur Courses, dans le coin haut sur Calendrier, en bas à droite ailleurs. Taille autour de 100px : elle ne doit jamais dominer la carte |
| `hairline` | utilitaire | filet le plus fin possible (0,5px, `line`) |
| `Icon` | `components/ui/Icon.tsx` | toutes les icônes de l'interface (boutons, menus, titres de rayon) |
| `Emoji` | `components/ui/Emoji.tsx` | emoji Fluent d'un article de courses (`public/emoji/<nom>.png`) |
| `card` | utilitaire | contenu neutre (listes, formulaires, états vides) |
| `PageLoading` + `skeleton` | `components/ui/PageLoading.tsx` | écran de chargement (`loading.tsx` de chaque page), affiché dès le clic : le `PageHeader` de la fonctionnalité, puis, seulement si l'attente dépasse 150 ms, des blocs `skeleton` dans sa couleur `soft` qui apparaissent en fondu et pulsent doucement (sans mouvement avec `prefers-reduced-motion`). Accueil : sa date (`HomeDate`, un `<header>`) déjà en place, blocs `coconut` ; Réglages : son titre (`SettingsTitle`) déjà en place. Règle : toute page montre son titre pendant le chargement |
| `card-inset` / `veil` | utilitaires | voile dans une carte pleine : nettement plus foncé que la carte (texte foncé à 18 %), texte presque noir de la même couleur (événement du jour, jour sélectionné) ; `card-inset` ajoute les marges |
| `big-number` | utilitaire | gros chiffre clé d'une carte |
| `page-wrap` | utilitaire | marges de toutes les pages ; le contenu arrive en fondu (200 ms), sauf le titre (`<header>`), déjà affiché par l'écran de chargement |
| `btn` | utilitaire | action principale, pilule encre ; une seule par écran |
| `btn-outline` | utilitaire | action secondaire, pilule à contour encre |
| `btn-feature` | utilitaire | action principale colorée d'une fonctionnalité, avec `FEATURES.<id>.fill` (« Cuisiner ») |
| `btn-feature-outline` | utilitaire | action secondaire colorée, fond crème, contour et texte de `FEATURES.<id>.text` (« Ajouter aux courses ») |
| `btn-danger` | utilitaire | supprimer : contour et texte `pink-deep` |
| `btn-lg` | utilitaire | à ajouter à un bouton texte dans la barre du bas : 56px de haut |
| `btn-xl` | utilitaire | très gros bouton texte du mode cuisine : 72px de haut, texte 20px, icônes 28px |
| `icon-btn` / `icon-btn-fill` | utilitaires | bouton rond à icône : neutre (fond `coconut` au survol) ou plein (avec `FEATURES.<id>.fill`) ; 44px, icône 24px. Tailles `icon-btn-sm` (32px, icône 18px : compteurs − +), `icon-btn-lg` (56px : le + de la barre du bas) et `icon-btn-xl` (72px, icône 32px : mode cuisine) |
| `pill` | utilitaire | lien en pilule (couleur = `currentColor`) ; jamais pour une simple information |
| `chip` (+ `is-active`) | utilitaire | choix dans une liste (quantité, unité) |
| `field` | utilitaire | champ de saisie |
| `eyebrow` | utilitaire | petit intitulé de section |
| `ItemTile` | `components/shopping/ItemTile.tsx` | tuile d'un article (toucher / appui long), 6,75rem de large minimum, nom 14px, détail 12px : carrée, elle grandit en hauteur pour le texte (nom et détail, 3 lignes max chacun) |
| `RecipeCard` | `components/recipes/RecipeCard.tsx` | carte d'une recette dans la bibliothèque : en haut la photo principale en 4:3, ou à défaut l'icône de sa catégorie sur fond rose ; puis catégorie, nom, note en étoiles et durée totale ; cœur dans une pastille crème si favori ; mention « Exemple » sur une recette d'exemple |
| `IngredientTile` | `components/recipes/IngredientTile.tsx` | ingrédient d'une recette, comme une tuile d'article de courses (emoji Fluent, nom, quantité), même grille (`ingredientGrid`) |
| `Avatar` | `components/ui/Avatar.tsx` | photo de profil ronde d'un membre (réglée dans Réglages en touchant son rond, pastille appareil photo) ; sans photo, l'initiale sur fond `coconut`. Signe une recette (28px, à la place de « Ajoutée par ») et un commentaire (40px) |
| `PhotoCarousel` | `components/recipes/PhotoCarousel.tsx` | photos en haut de la fiche recette, 4:3, on glisse de l'une à l'autre ; la principale en premier ; points `pink-deep` en dessous (pas de points pour une seule photo) |
| `CookMode` | `components/recipes/CookMode.tsx` | mode cuisine (voir la règle Recettes) |
| `PhotoPicker` | `components/recipes/PhotoPicker.tsx` | choix d'une photo en pointillés, aperçu 4:3 une fois choisie |
| Fiche (bottom sheet) | `components/shopping/ItemDetailsSheet.tsx` | fond `page`, coins 2rem, enregistrement automatique |

## Boutons

Règle : **aucun bouton fait à la main.** Tout bouton passe par un utilitaire de `globals.css` ; on n'y ajoute que de la mise en page (`flex-1`, `self-end`, `mt-3`…), jamais de taille, de couleur de fond, de rayon, de typo ou de taille d'icône.

- **Boutons texte** (`btn`, `btn-outline`, `btn-feature`, `btn-feature-outline`, `btn-danger`) : même forme (pilule), texte 14px semi-gras, icônes forcées à 20px. Dans la barre du bas, ajouter `btn-lg` (56px) ; en mode cuisine, `btn-xl` (72px, texte 20px, icônes 28px).
- **Boutons ronds** (`icon-btn`, `icon-btn-fill`) : 44px, icône 24px ; `icon-btn-sm` pour les compteurs − +, `icon-btn-lg` pour le + de la barre du bas, `icon-btn-xl` en mode cuisine.
- Les tailles passent par des variables CSS (`--btn-height`, `--btn-font`, `--btn-icon`, `--icon-btn-size`…) : `btn-lg/xl` et `icon-btn-sm/lg/xl` gagnent quel que soit l'ordre des classes.
- Un nouveau type de bouton ? On l'ajoute ici et dans `globals.css`, jamais directement dans un composant.

## Icônes

Le jeu d'icônes dessiné sur mesure est abandonné (8 novembre 2026) : on garde Tabler. Seules les six grandes icônes des fonctionnalités (`FeatureArt`, `FeatureIcon`) restent dessinées.

Jeu [Tabler Icons](https://tabler.io/icons), en contour, trait 1,75, importé uniquement via `Icon` (`<Icon name="carrot" />`).
Une icône prend la couleur du texte : son contraste suit celui du texte, sur tous les fonds.
Tailles : 20 titres de rayon · 24 barre du bas.

**Articles de courses : emojis Fluent** (Microsoft, 3D, licence MIT), choisis le 8 novembre 2026 parce que Tabler n'a pas d'icône pour chaque aliment.
Fichiers PNG 128px dans `public/emoji/`, nommés comme le dossier Fluent en minuscules (`Kiwi fruit` → `kiwi_fruit.png`), affichés via `Emoji`.
Tailles : 40 tuiles et fiches. Les titres de rayon gardent une icône Tabler, pas d'emoji. Fond toujours **crème** (`bg-surface`) : c'est là qu'ils sont le plus lisibles, pas de couleur par emoji ni par rayon.
On peut choisir un autre emoji dans la fiche de l'article (champ `emoji` de l'article, parmi `EMOJIS`) ; « Auto » revient à celui du catalogue. Un article absent du catalogue prend l'emoji dont les mots-clés ressemblent le plus à son nom (`guessEmoji` : mots français d'Unicode + `EMOJI_WORDS`), sinon celui de son rayon (`emojiFor`). Son rayon est deviné de la même façon (`aisleFor`). Ajouter un emoji : télécharger `assets/<Nom>/3D/<nom>_3d.png` depuis github.com/microsoft/fluentui-emoji, le réduire à 128px, puis l'associer dans `lib/shopping/catalog.ts`.

## Formes et espacements

- Rayons : grandes cartes 1,75rem · cartes 1,5rem · tuiles `rounded-3xl` · fiches 2rem · pilules et boutons arrondis complets.
- Marges de page : `page-wrap` partout (1rem sur les côtés, le même bord pour le logo, les titres et les cartes). Pas de décalage ajouté aux titres ou aux champs.
- Marge intérieure : 1,25rem pour `tile`, `card` et `field`, pour que les textes s'alignent d'une carte à l'autre. Espace entre cartes empilées `gap-2`.
- Cartes de l'accueil, même grille : titre en haut, détail en bas, grande icône au fond. Le chiffre et son libellé forment un seul bloc à droite.
- Pas d'ombres : la couleur sépare les blocs. Tout élément `surface` posé sur `page` porte un filet `hairline` (0,5px), sinon il ne se voit pas assez.

## Règles

- Pas de textes d'explication (« Touche un ingrédient pour… ») : l'app doit se comprendre toute seule. Si un geste a besoin d'être expliqué, c'est l'écran qu'il faut revoir.
- Texte sur couleur : uniquement les paires du tableau `FEATURES` ou `*-deep` sur `*-soft`.
- Pas d'emoji texte dans l'interface : des icônes `Icon` pour l'interface, des emojis Fluent (`Emoji`) pour les articles de courses. Seuls les titres d'événements venus de Google Agenda peuvent contenir des emojis texte.
- Les choix s'enregistrent tout de suite (pas de bouton « Enregistrer » dans les fiches).
- Ce qui ressemble à un bouton doit en être un : une information (« Demain ») s'écrit en texte simple, jamais en pilule. Les cartouches d'une recette (saisons, labels), fond `pink-soft`, texte `pink-deep`, sans contour, sont des liens : on les touche pour ouvrir la bibliothèque avec ce filtre (`/recipes?label=…`, `?season=…`, `?category=…` pour la catégorie au-dessus du nom). Une saison autre que celle du moment s'affiche en tête des filtres (« Été × »). « Toute l'année » ouvre toutes les recettes, sans filtre de saison (`?season=all`).
- Les réglages (membres du foyer — dont mon prénom, sur ma propre ligne —, invitations, agenda relié, déconnexion) vivent dans une seule page Réglages (`/settings`). Le logo Hestia est partout, centré ; l'icône Réglages (roue dentée) est en haut à droite de l'accueil seulement.
- En-tête (`AppHeader`) : le logo Hestia centré, partout. À gauche, le bouton retour (flèche seule dans une `pill`, couleur de la fonctionnalité) sur toutes les pages sauf l'accueil et la création du foyer (l'app installée n'a pas le retour du navigateur) ; à droite, la roue des Réglages sur l'accueil seulement. La page parente se règle dans `backFor()` ; ne pas remettre de lien retour dans les pages. Dans l'app installée, glisser depuis le bord gauche fait aussi retour (une flèche suit le doigt, pleine quand on peut lâcher).
- Tuiles d'articles : fond crème ; suggestions avec contour ; récemment achetés sans fond (couleur de la page), contour pointillé épais, emoji estompé.
- Choix d'affichage (Mois / Semaine) : dans la barre du bas, l'actif en fond `ink`.
- Calendrier : le mois est la vue principale. Au-dessus du calendrier : le titre de la période, le choix de l'année juste à côté, puis le retour à aujourd'hui (le chiffre du jour dans une icône de calendrier) et les flèches à droite. En semaine, la carte de chaque jour contient ses événements (colonnes sur ordinateur, cartes empilées sur téléphone) ; la date du jour est en `olive` plein ; le jour sélectionné, s'il n'est pas aujourd'hui, porte un contour `olive-ink`.
- Recettes : la bibliothèque est une grille filtrée par deux rangées de `chip` : les catégories (« Toutes » par défaut, avec leur icône), puis De saison, Favoris et les labels, séparés par un filet. « Effacer les filtres » à droite du nombre de recettes. Tant que le foyer a moins de 6 recettes, des exemples (`lib/recipes/examples.ts`, pas en base, photos Unsplash) complètent la grille, chacune marquée « Exemple » ; leur fiche s'ouvre comme une vraie (mention « Exemple » à la place du favori et de la suppression, sans photos). « De saison » est coché en arrivant s'il y a au moins 4 recettes de saison ; une recette porte une ou plusieurs saisons cochées (obligatoire, « Toute l'année » = les quatre), proposées d'après les ingrédients (`lib/recipes/seasons.ts`). Les labels (végétarien, sans lactose…) se cochent comme les catégories et servent aussi de filtres. Fiche recette, dans l'ordre : carrousel de photos, catégorie, nom (favori et suppression à droite), photo de qui l'a ajoutée (`Avatar`) puis note en étoiles (un lien vers le commentaire, étoiles pâles si pas de note), lien d'origine, cartouches (saisons, labels avec leur icône), trois cartes Préparation / Cuisson / Personnes (− et + recalculent les quantités des ingrédients), ingrédients, étapes, photos, puis « Commentaire » (toujours là, avec un + rose rond à droite du titre qui ouvre la fiche « Note et commentaire » ; vide, une carte l'explique) présenté comme un message : `Avatar` de qui l'a écrit, bulle `surface` (coin haut gauche moins arrondi) avec son prénom, la date et le texte ; barre du bas : « Ajouter aux courses » (pilule `surface` à contour `rose` 1,5px, texte `pink-deep`, prend la place restante) et « Cuisiner » en rose plein à droite ; les deux en texte 14px semi-gras, icônes 20px. Ordre du formulaire : photo, nom, durées et personnes, ingrédients, étapes, puis catégorie, labels, saisons (cochées seules d'après les ingrédients tant qu'on n'y touche pas), note et lien facultatifs. Les ingrédients s'ajoutent comme aux courses : une pilule de saisie avec le bouton + (« 200 g de farine »), une tuile par ingrédient, une fiche du bas (`IngredientSheet`) pour le nom, la quantité et l'unité. Les étapes se saisissent une par case (pastille numérotée `rose`), chacune sera un écran du mode cuisine. Taper une recherche décoche « De saison ». L'historique s'ouvre en haut à droite : les recettes cuisinées, regroupées par jour (« Aujourd’hui », « Hier », « Samedi 7 novembre »), une `card` par recette avec sa photo, le nombre de personnes et l'`Avatar` de qui l'a cuisinée. Mode cuisine (« Cuisiner », `/recipes/{id}/cuisiner?personnes=`, `CookMode`) : centré et de la même largeur que la barre du bas (32rem de contenu), sur téléphone comme sur grand écran ; tout y est en très gros dès la première étape, comme un mode accessibilité (la première page, les ingrédients, garde les tailles habituelles) (texte d'étape 30px, 24px si elle est longue, 20px si très longue ; boutons `btn-xl` et `icon-btn-xl` ; tuiles d'ingrédients `large` dans la fiche ouverte pendant les étapes), et une étape tient sur l'écran d'un téléphone sans défiler ; l'écran reste allumé ; un trait `rose` par étape en haut pour l'avancement ; d'abord « Ingrédients » (nombre de personnes − + et tuiles), puis une étape par écran en texte 24px, avec « Étape 2 sur 6 » en `font-display` 20px `pink-deep`. Chaque ingrédient cité porte sa quantité en `pink-deep` semi-gras, recalculée pour le nombre de personnes (« les châtaignes (200 g) », `lib/recipes/cook.ts`) ; « la moitié du beurre » donne la moitié, « le reste des… » rien ; un nombre déjà écrit (« 200 g de farine ») est recalculé à sa place. Chaque durée de l'étape (« 25 minutes », « 1 h 30 ») donne un bouton « Minuteur 25 min » (`btn-feature-outline` `btn-xl` rose, toute la largeur), posé en bas, juste au-dessus de « Étape suivante » et aligné sur elle, à la même place sur toutes les étapes ; une fois lancé, il est remplacé par la pilule du minuteur. Les minuteurs lancés s'empilent au-dessus de la barre (pilule `surface`, compte à rebours, puis ce qu'il chronomètre, tiré de la phrase de l'étape — « Laisse cuire à feu moyen » —, avec l'étape et la durée en dessous), et la pilule passe en `rose` plein et sonne toutes les 3 s une fois terminé, jusqu'à la coche. En haut de l'étape, sa photo (`StepPhoto`), une seule par étape, en grand : l'écran d'une étape prend exactement la hauteur libre au-dessus de la barre, les minuteurs en bas, le texte au-dessus, et la photo prend la place qui reste (au plus 45 % de l'écran, au moins 6rem) ; elle rétrécit plutôt que de cacher le texte ; sans photo, une case en pointillés « Photo de l’étape » (appareil photo) ; on touche la photo pour la voir en entier, la changer ou la supprimer. Elles restent à part des photos du plat (ni carrousel, ni photo principale) et s'affichent en petit sous chaque étape de la fiche. À droite de « Étape 2 sur 6 », le bouton « Ingrédients » (`btn-feature-outline` rose, taille normale, icône carotte) ouvre la liste des ingrédients. Juste au-dessus des minuteurs, « Ensuite : … » (flèche vers le bas, 18px, `ink-faint` pour rester discret, sur une ligne) donne le début de l'étape suivante et montre qu'il y a la suite plus bas ; on le touche pour y descendre ; rien à la dernière étape. En faisant défiler sous l'étape : « Toutes les étapes », la vue d'ensemble de la recette, avec les quantités (texte 18px) ; l'étape en cours sur fond `pink-soft` avec son numéro en `rose` plein, celles déjà faites estompées avec une coche ; on touche une étape pour y aller. Barre du bas : l'étape précédente en rond `icon-btn-xl`, puis « Étape suivante ». La liste des ingrédients s'ouvre dans une fiche du bas (personnes modifiables) ; « Suivante » en rose plein ; « C’est prêt » à la dernière étape. Puis « C’est prêt ! » (la recette entre dans l'historique), la note et le commentaire (`ReviewFields`, comme la fiche « Note et commentaire »), « Photo du plat », et « Retour à la recette ». Ajout d'une recette : le + de la barre du bas ouvre en éventail, juste au-dessus de lui et par-dessus la page assombrie, deux pilules crème (texte puis icône dans une pastille `pink-soft`) ; le + tourne en × pour refermer (`AddRecipeMenu`) : « Importer avec Claude » (4 étapes numérotées : copier la consigne, demander à Claude, ajouter une photo facultative, coller le « code recette » de `lib/recipes/import-code.ts`, puis « Vérifie la recette » avec le formulaire rempli) ou « Écrire moi-même » (formulaire vide). « Ajouter aux courses » (barre du bas de la fiche) ouvre sa page (`/recipes/{id}/courses`, `RecipeToShopping`) pour le nombre de personnes choisi sur la fiche (`?personnes=`, modifiable) : les ingrédients en tuiles cochées (fond crème et contour `pink-deep`, sans coche), sauf ceux déjà dans la liste (« Déjà dans la liste ») et ce qu'on a toujours en cuisine (sel, poivre, eau, huile, vinaigre, sucre : `isPantryStaple`) ; une tuile décochée ressemble à un article récent. Ce qui se compte à la pièce est arrondi au-dessus (1,5 pâte → 2). Le bouton rose plein du bas ajoute tout d'un coup (`addIngredientsToShopping`) : un article déjà dans la liste n'est pas écrasé, sa quantité s'additionne si l'unité est la même. Titre de la page : le nom de la recette ; le bouton dit tout (« Ajouter 7 articles à la liste de courses »). Puis une `card` neutre confirme : les emojis des articles ajoutés apparaissent un à un en petit tas incliné (`pop-in`, « +N » orange au-delà de 9), puis « C’est dans la liste ! » en grand et « 9 articles pour 4 personnes. Bon appétit ! » ; dessous, côte à côte, « Retour à la recette » (`btn-feature-outline` rose) puis « Voir la liste » (`btn-feature` orange, icône panier). Photos : plusieurs par recette, la photo principale (contour `pink-deep`, mention « Principale ») s'affiche sur la carte et en premier dans le carrousel en haut de la fiche (`PhotoCarousel`), suivie des autres.
- Mouvement : à l'appui, une carte `tile` s'enfonce légèrement (rétrécit de 2 %, vite) puis revient avec un léger rebond au relâché ; pas d'effet au survol. Désactivé avec `prefers-reduced-motion`.
- Chargement : jamais de flash. Le contenu d'une page arrive en fondu dès qu'il est prêt, sans délai ajouté ; les blocs d'attente n'apparaissent que si l'attente se prolonge.
