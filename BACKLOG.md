# Backlog — Hestia

Sujets à reprendre. Chaque sujet résume ce qui a été décidé, ce qui reste ouvert et les fichiers à toucher.

> Les deux sujets ont besoin d'un **service worker** (`public/sw.js`), un script que le navigateur garde en mémoire et fait tourner en arrière-plan. Un seul fichier suffit pour les deux. Le premier sujet traité le crée.

---

## 1. Courses utilisables hors ligne

**But** : ouvrir la liste et cocher des articles au magasin sans réseau, puis tout synchroniser quand le réseau revient.

### Déjà en place
- L'écran se met à jour tout de suite quand on coche, sans attendre le serveur (`src/components/ShoppingList.tsx`).
- Les modifications partent au serveur une par une, dans l'ordre (`queue`, une file en mémoire).
- La liste se recharge toute seule toutes les 30 s (`REFRESH_EVERY_MS`).
- L'app est installable : manifest dans `src/app/manifest.ts` (commit `005e299`).

### Ce qui manque
1. **Afficher la page sans réseau** : aujourd'hui, la page ne s'ouvre pas du tout hors ligne. Le service worker doit garder en cache la page `/shopping` et ses fichiers.
2. **Garder les modifications faites hors ligne** : la file d'attente n'existe qu'en mémoire, donc tout est perdu si on ferme l'app. Il faut l'enregistrer sur le téléphone (IndexedDB) et l'envoyer au retour du réseau.

### Décision à prendre (avec Laurie)
| | **A. Garder les Server Actions** | **B. Mode hors ligne de Firestore** |
|---|---|---|
| Principe | File d'attente enregistrée sur le téléphone, rejouée au retour du réseau | Le SDK client Firestore gère lui-même le cache et la synchro (`persistentLocalCache`) |
| Temps réel | Non, on garde le rechargement toutes les 30 s | Oui, les changements de l'autre apparaissent tout de suite (`onSnapshot`) |
| Conflits | La dernière modification envoyée gagne | Gérés par Firestore |
| Règle du projet | Respectée | **Enfreinte** : la liste ne passerait plus par le serveur (voir `CLAUDE.md`) |
| À ajouter | Code maison (IndexedDB, rejeu) | Règles de sécurité Firestore pour `households/{hid}/shoppingItems` |

Recommandation : **B**. Le SDK est fait pour ce cas, et le temps réel est utile pour une liste partagée. Si B est choisi, mettre à jour la règle « Pattern à respecter » dans `CLAUDE.md` pour la liste de courses.

### Terminé quand
- [ ] En mode avion, l'app installée ouvre la liste.
- [ ] Les articles cochés en mode avion sont bien envoyés au retour du réseau, même si l'app a été fermée entre-temps.
- [ ] La CI passe (`npx tsc --noEmit`, `npm run lint`).

---

## 2. Notifications quand l'autre modifie la liste

**But** : prévenir l'autre membre du foyer quand des articles sont ajoutés à la liste, ou pris pendant les courses.

Exemples :
- 🛒 « Quentin a ajouté : lait, œufs »
- ✅ « Laurie a pris 12 articles »

### Contraintes iPhone (appareil principal)
- iOS **16.4 ou plus**.
- Les notifications ne marchent que depuis l'app **ajoutée à l'écran d'accueil** (Safari → Partager → « Sur l'écran d'accueil »), pas depuis Safari.
- La demande de permission doit venir d'un **appui sur un bouton** (règle Apple).
- Test en `https` uniquement, donc sur home.qhutch.com : `localhost` ne marche pas sur l'iPhone.

### Choix technique
- Bibliothèque **`web-push`** avec des clés **VAPID** (une paire de clés qui identifie le site auprès d'Apple). C'est plus simple et plus fiable sur iPhone que Firebase Cloud Messaging.
- Générer les clés avec `npx web-push generate-vapid-keys`, puis les ajouter dans Vercel et dans `.env.example` :
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT` (ex. `mailto:…`)

### Étapes
1. **Service worker** : gérer l'événement `push` (afficher la notification) et `notificationclick` (ouvrir `/shopping`).
2. **Bouton « Activer les notifications »** dans Réglages (`src/app/(app)/settings/`), en suivant `apps/web/DESIGN.md`. Afficher une aide si l'app n'est pas installée sur l'écran d'accueil.
3. **Enregistrer l'abonnement** par une Server Action, dans `households/{hid}/members/{uid}/pushSubscriptions/{id}`. Supprimer l'abonnement quand l'envoi renvoie 404 ou 410 (abonnement expiré).
4. **Envoyer** depuis `addShoppingItem` et `setShoppingItemInList` (`src/app/(app)/actions.ts`), **seulement aux autres membres**.
5. **Regrouper** pour éviter le spam : pendant les courses, on coche 20 articles d'affilée. Envoyer une seule notification après environ 2 min sans nouvelle action (ex. un doc « en attente » dans Firestore, envoyé par un cron Vercel ou à l'action suivante).
6. Ajouter la nouvelle collection au tableau de `CLAUDE.md`.

### Terminé quand
- [ ] Laurie ajoute un article → Quentin reçoit une notification sur son iPhone, et inversement.
- [ ] Cocher 10 articles d'affilée ne donne qu'une seule notification.
- [ ] Celui qui fait l'action ne reçoit rien.
- [ ] La CI passe.
