# Vidéos de démo — Nouveautés

Checklist de tournage pour les entrées de `apps/web/lib/whats-new.constants.ts`.

## Réglages communs

- Résolution **1440×900**, curseur visible, **sans son**
- Données de démo crédibles — jamais « Produit test » ni « Dupont »
- Afficheur de touches à l'écran (KeyCastr) **obligatoire** pour la vidéo ⌘K
- Export `.mp4` dans `apps/web/public/videos/whats-new/<id>.mp4` + une image poster

## Intégration après tournage

Pour chaque vidéo, ajouter sur son entrée dans `whats-new.constants.ts` :

```ts
media: {
  type: "video",
  src: "/videos/whats-new/<id>.mp4",
  posterSrc: "/images/whats-new/<id>.webp",
},
```

Sans `media`, l'entrée s'affiche en texte seul — aucun placeholder, rien à corriger.

---

## Avancement

- [ ] `product-image-ai` — Vos photos produit passent au studio (~50 s, script section 1)
- [x] `sidebar-simplified` — Un menu plus court · 45 s · en ligne
- [x] `navigation-refresh` — ⌘K vous emmène partout · 23 s · en ligne
- [x] `product-variants` — Des variantes simples · 46 s · en ligne
- [x] `product-detail-hub` — Chaque produit a sa fiche · 34 s · en ligne
- [x] `reservations-unified-views` — Vos réservations s'ouvrent sur le calendrier · 50 s · en ligne
- [ ] `product-creation-flow-redesign` — Deux sections et votre produit est en ligne (~35 s)
- [x] `reservation-creation-simplified` — Une réservation, une seule page · 53 s · en ligne

### Traitement appliqué

Screen Studio sort en 3468 × 2160, soit **1,605:1 et non 16:9**. Le ratio est conservé
tel quel — les cadres de la page changelog portent `aspect-1734/1080`. Ni rognage (les
zooms vont bord à bord, on couperait de l'UI) ni bandes de remplissage. Enregistrer une
prochaine vidéo dans un autre ratio impose de mettre à jour cette classe dans
`whats-new-entry-media.tsx` et `whats-new-entry-thumbnail.tsx`.

```sh
ffmpeg -i source.mp4 -vf "scale=1734:1080:flags=lanczos,format=yuv420p" \
  -an -c:v libx264 -crf 23 -preset slow -movflags +faststart \
  apps/web/public/videos/whats-new/<id>.mp4

# Poster : choisir une frame qui montre le sujet, pas l'écran d'accueil de départ
ffmpeg -ss <t> -i <id>.mp4 -frames:v 1 -vf "scale=1600:-2:flags=lanczos" poster.png
cwebp -q 82 poster.png -o apps/web/public/images/whats-new/<id>.webp
```

Monter `-crf` à 26 si le fichier dépasse 5 Mo.

`keyboard-shortcuts` n'a pas besoin de vidéo : le tableau des huit raccourcis se lit plus vite qu'il ne se regarde.

---

## 1. `product-image-ai` — ~50 s

C'est l'avant qui vend : les photos de départ doivent être moches de façon crédible (fond de cuisine, garage, lumière quelconque). Solde de crédits confortable — l'alerte « Crédits IA insuffisants » ne doit jamais apparaître.

- [ ] **0–6 s** — Formulaire produit, section Photos. Déposer une photo prise « à la maison ». Le dialog **« Que faire de cette photo ? »** s'ouvre : plan fixe 2 s sur les quatre cartes et leurs chips de coût.
- [ ] **6–13 s** — Clic **Améliorer avec l'IA**. La vignette passe en file : état en cours, puis « À valider ». Ne pas accélérer — l'attente est courte et réelle.
- [ ] **13–22 s** — Le dialog **Avant / Après**. Basculer le fond damier → blanc, laisser 3 s de comparaison pleine, puis **Utiliser cette version**. Le badge « Améliorée par IA » apparaît sur la vignette.
- [ ] **22–30 s** — Deuxième photo, menu de la vignette → **Supprimer l'arrière-plan**. Dialog « Arrière-plan supprimé », accepter. Le cadrage d'origine n'a pas bougé — c'est le point.
- [ ] **30–39 s** — Galerie de 3–4 photos hétérogènes : clic **Uniformiser les photos**. Les vignettes avancent une à une — en attente, en cours, à valider. Valider les résultats à la suite.
- [ ] **39–48 s** — Ouvrir **Historique de la photo** sur la première : toutes les versions listées, badge « Utilisée ». Cliquer la version **originale** → la vignette revient en arrière. Re-basculer sur la version IA. Rien n'est perdu.
- [ ] **48–50 s** — Plan final sur la galerie uniformisée : quatre photos, même fond, même cadrage.

**À préparer** — [ ] un vrai produit avec 3–4 photos hétérogènes crédibles (le même objet photographié dans des contextes différents), [ ] un solde de crédits suffisant pour ~5 opérations, [ ] vérifier que la file ne montre aucune photo en échec.

**Piège** — ne pas cliquer Annuler pendant la file : l'annulation est rassurante dans l'app, confuse dans une démo. Et ne pas supprimer de version dans l'historique — le message est « rien ne s'efface ».

---

## 2. `sidebar-simplified` — ~38 s

À chaque entrée disparue du menu, on montre où elle a atterri.

- [x] **0–4 s** — Accueil, menu déplié. Le curseur descend lentement les 8 entrées, sans cliquer. Pause d'une demi-seconde en bas.
- [x] **4–13 s** — Clic **Réservations**. Bascule Liste → Calendrier → Planning, une seconde sur chaque.
- [x] **13–24 s** — Clic **Produits** → ouvrir une fiche. Scroll jusqu'à la section **Inventaire**, pause sur la table des exemplaires.
- [x] **24–29 s** — Clic **Modifier** → le formulaire s'ouvre → retour immédiat vers la fiche.
- [x] **29–36 s** — Clic **Paramètres**. Ouvrir le groupe **Compte et données**, survoler **Abonnement** puis **Parrainage**.
- [x] **36–38 s** — Retour à l'accueil. Plan fixe sur le menu court.

**À préparer** — [ ] un produit en suivi par unité avec des exemplaires, [ ] quelques réservations réparties sur la semaine.

---

## 3. `navigation-refresh` — ~50 s

- [x] **0–4 s** — Sur Réservations. `⌘K` : la palette s'ouvre. 2 s sur les groupes fermés.
- [x] **4–14 s** — Taper un nom de client, lentement. Entrée → sa fiche s'ouvre.
- [x] **14–24 s** — `⌘K`. Taper **« tva »** — la page Taxes remonte. Entrée → le réglage s'ouvre.
- [ ] **24–36 s** — **Paramètres** → barre de recherche → un réglage précis → la page s'ouvre, défile, **le réglage se surligne**. Rester 3 s dessus.
- [x] **36–46 s** — Ouvrir un produit → **Modifier**. Plan sur le fil d'Ariane. Cliquer « Produits » pour remonter.
- [x] **46–50 s** — `⌘K`, « accueil », Entrée.

**À préparer** — [ ] un client au nom distinctif et facile à taper, [ ] vérifier que « tva » remonte bien la page Taxes.

---

## 4. `product-variants` — ~50 s

Le plan final est la **liste des produits**, pas la boutique.

- [x] **0–7 s** — Fiche produit → section stock. Bascule **Quantité simple → Suivi par unité**. Le badge passe de « Par défaut » à « Avancé ».
- [x] **7–15 s** — Plan fixe : **Taille et Couleur sont déjà là**, avec leurs valeurs. Ne pas cliquer.
- [x] **15–21 s** — Ajouter **Pointure** d'un clic. Les valeurs arrivent pré-remplies.
- [x] **21–33 s** — Renseigner 3 exemplaires : une taille pour chacun, puis le **sélecteur de couleur** sur un, avec une teinte hors palette.
- [x] **33–42 s** — **Gérer les variantes** : le catalogue partagé. Renommer une variante.
- [x] **42–50 s** — Retour à la **liste des produits**. Plan fixe sur **une seule ligne** là où il y en aurait eu trois.

**À préparer** — [ ] un produit dont les tailles ont du sens (combinaison, chaussures, vélo), [ ] un catalogue sans doublons par taille.

**Piège** — ne pas filmer la boutique : le sélecteur de combinaison y existait déjà.

---

## 5. `product-detail-hub` — ~60 s

Les plans 3 et 5 doivent être **dans la même prise**.

- [x] **0–4 s** — Liste des produits → clic sur un produit. On arrive sur la fiche, pas sur un formulaire. Plan fixe 2 s.
- [x] **4–14 s** — Panoramique lent sur les **quatre stats**. Temps d'arrêt sur le taux d'utilisation.
- [x] **14–26 s** — Section **Inventaire**. Déclarer une **maintenance** sur un exemplaire, valider.
- [x] **26–40 s** — Section **Réservations** : Liste → Calendrier. **Cliquer-glisser sur une plage libre** → le formulaire s'ouvre, daté et rempli avec ce produit. Retour.
- [x] **40–50 s** — Le **journal d'activité** à droite : la maintenance du plan 3 y apparaît.
- [x] **50–60 s** — Remonter, clic **Modifier** → le formulaire. Retour. Fin sur la fiche complète.

**À préparer** — [ ] un produit en suivi par unité avec 3–4 exemplaires, [ ] un historique de réservations réel (sinon les stats affichent des zéros), [ ] au moins une réservation à venir.

---

## 6. `reservations-unified-views` — ~55 s

On ne clique presque pas, on fait défiler.

- [x] **0–5 s** — Clic **Réservations**. Le calendrier est là, calé sur aujourd'hui. Ne rien toucher 2 s.
- [x] **5–15 s** — Défilement horizontal continu, 3–4 semaines à droite puis retour. **Le libellé du mois doit être dans le cadre.**
- [x] **15–21 s** — Bascule **Semaine → Mois**. Pause : on est resté à la même date.
- [x] **21–32 s** — Survol d'une réservation, carte ouverte **3 s pleines**. Puis curseur sur une ligne produit dedans, sans cliquer.
- [x] **32–45 s** — Filtres : **Départs du jour** → retour à Toutes → filtre **statut**, cocher « Annulées » → filtre **produits**, taper 3 lettres, cocher deux produits.
- [x] **45–55 s** — Bascule **Planning**, défiler (la colonne produits reste collée). Bascule **Liste** → cartes → tableau. Plan final sur le sélecteur de vues.

**À préparer** — [ ] des réservations sur 5–6 semaines, [ ] un départ et un retour aujourd'hui, [ ] une réservation annulée, [ ] **une réservation bien remplie** pour le plan 4 : vrai nom, 2–3 produits, adresses de livraison aller et retour, montant crédible.

---

## 7. `product-creation-flow-redesign` — ~35 s

Le message est « c'est court » : la vidéo doit l'être.

- [ ] **0–4 s** — Produits → **Ajouter un produit**. Plan fixe : une page, deux sections, un panneau à droite.
- [ ] **4–18 s** — Nom, prix, 2 photos déposées. **Aperçu et progression dans le cadre**, ils se remplissent pendant la saisie.
- [ ] **18–26 s** — Descendre jusqu'à Tarifs et stock, saisir une quantité. Pas d'accessoires, pas d'assurance.
- [ ] **26–35 s** — **Créer et dupliquer**. La copie « (copie) » s'ouvre pré-remplie.

**À préparer** — [ ] 2 photos correctes, [ ] un nom de produit crédible.

---

## 8. `reservation-creation-simplified` — ~55 s

**Un seul mouvement de scroll, pas de coupe.**

- [x] **0–5 s** — Nouvelle réservation. Plan fixe sur la page entière.
- [x] **5–13 s** — **Créer un client** à côté de la recherche : nom, téléphone, valider. Il est sélectionné automatiquement.
- [x] **13–20 s** — Les dates. Le récap commence à se remplir.
- [x] **20–30 s** — Ajouter 2 produits. **Récap et total restent visibles.**
- [x] **30–42 s** — Sur une ligne, **Remise %** → 10. Le prix unitaire résultant s'affiche. Puis une **remise globale**. Le total bouge deux fois.
- [x] **42–49 s** — Ajuster la **caution**. Remonter, changer une date : le total se recalcule.
- [x] **49–55 s** — Valider. Fin sur la réservation créée.

**À préparer** — [ ] deux produits **disponibles** sur la période choisie (sinon la modale de surbooking s'ouvre et casse le rythme).

---

## Arbitrages à trancher

- [ ] **Le cliquer-glisser apparaît dans deux vidéos** (`reservations-unified-views` plan 6 et `product-detail-hub` plan 4). Il est décoratif dans la première, structurant dans la seconde — envisager de le couper de la première.
