# WORLDLAYER — PRD v5.2 (Unifié)
## *La carte qui sait tout*

---

| Clé | Valeur |
|---|---|
| **Version** | 5.2 — Mars 2026 |
| **Statut** | Spécification détaillée active · Référence produit cible |
| **Licence** | MIT |
| **Coût cible** | ~2.70 $/mois à 1M utilisateurs actifs/mois |
| **Origine** | Alignement complet avec l'implémentation v1.0 (Mars 2026) |

> *Un seul outil. Un seul clic. Toutes les informations utiles pour ce lieu.*
>
> Ce document décrit la cible produit.
> L'état réel du dépôt et les écarts d'implémentation sont suivis dans [audit_technique_complet.md.resolved](./audit_technique_complet.md.resolved).

---

## 0. Principes fondateurs

### Règles absolues

1. **L'interface ne change jamais de forme.** Que l'utilisateur cherche un restaurant ou un hôpital, le panneau, les couleurs, la typographie et les marges sont identiques. Seul le contenu et son ordre de priorité changent.
2. **Aucun jargon technique n'est visible par l'utilisateur.** Pas de "Mode Urgence", pas de "Synthèse IA", pas de "Command Layer". L'interface parle comme un humain.
3. **L'information arrive progressivement.** Le nom du lieu apparaît d'abord (< 300ms), puis la météo, puis le reste. Jamais d'écran vide ni de spinner bloquant.
4. **Zéro friction.** Chaque action courante en 1 tap. Actions avancées en 2 taps maximum.
5. **Data Storytelling & Preuve (Trust Design).** Afficher des phrases claires et naturelles (ex: "Vent violent prévu") toujours accompagnées de la donnée brute correspondante (ex: "85 km/h"). Le texte humanise, le chiffre prouve et rassure.
6. **Déterministe par défaut, IA en dernier recours.** Privilégier des fonctions hardcodées (0ms, 0$) pour traduire les données brutes en texte naturel. L'IA ("En bref") est réservée exclusivement à la synthèse de contextes complexes à la demande.

### Vocabulaire de l'interface (ce que l'utilisateur voit)

| Terme interne (dev) | Terme affiché (utilisateur) | Justification |
|---|---|---|
| Signal | **Signal** | Identité et briefing immédiat du lieu |
| Météo | **Météo** | Données atmosphériques |
| Tendance | **Tendance** | Perspective temporelle de la semaine |
| Proximité | **Proximité** | Points d'intérêt et exploration locale |
| Histoire | **Histoire** | Récit et culture du territoire |
| Mode Urgence | **Assistance** | Rassurant, utile, pas anxiogène |
| Synthèse IA | **En bref** | L'utilisateur veut un résumé, pas savoir que c'est une IA |
| Drawer / Bottom Sheet | **Panneau** | Hub d'intelligence contextuelle |

### Vocabulaire technique (pour les développeurs et contributeurs)

| Terme | Définition |
|---|---|
| API | Une "prise électrique" entre deux logiciels qui leur permet de se parler et d'échanger des données |
| Cache | Copie d'une réponse stockée pour ne pas refaire la même requête. La fondation de l'architecture zéro coût |
| Edge / CDN | Réseau de serveurs distribués mondialement. Réponse servie depuis le datacenter le plus proche |
| TTL (Time To Live) | Durée pendant laquelle une donnée en cache est considérée valide |
| Vélocité des données | À quelle vitesse une donnée change. Détermine le TTL et la stratégie de cache |
| Frontend | Ce que l'utilisateur voit et utilise (l'interface, les boutons, la carte...) |
| Backend | La partie invisible qui fait les calculs et stocke les données |
| MVP | Minimum Viable Product : la version la plus simple testable par de vrais utilisateurs |
| PWA | Progressive Web App : application web installable sur mobile, fonctionnant hors ligne |
| GeoJSON | Format standard pour représenter des données géographiques en JSON |
| GTFS | General Transit Feed Specification. Format standard pour les horaires de transports |
| IndexedDB | Base de données dans tous les navigateurs modernes. Accessible via Dexie.js |
| PMTiles | Format de fichier contenant des tuiles cartographiques d'une zone entière |
| POI | Point of Interest. Lieu d'intérêt : restaurant, hôpital, musée, gare... |
| Stale-while-revalidate | Stratégie de cache : servir la donnée en cache immédiatement et la rafraîchir en arrière-plan |

---

## 1. Résumé exécutif

### Le problème

Les outils cartographiques répondent à *"Où est X ?"* mais pas à *"Qu'est-ce qui se passe ici ? Qu'est-ce que je dois savoir ?"*

- Un touriste arrive dans une ville étrangère : 6 applications différentes pour météo, restaurants, transports, sécurité.
- Un randonneur veut gravir un sommet : 3 apps à combiner mentalement (topo, météo, refuges).
- Quelqu'un a un problème médical à l'étranger : ne sait pas quel numéro appeler ni où aller.
- Un journaliste veut visualiser une épidémie : agrégation manuelle de données OMS, cartes de risques, vaccinations.

### La solution

WorldLayer centralise toutes ces informations dans **une seule interface**. Un clic sur n'importe quel point du globe déclenche une cascade intelligente de données. Grâce au cache partagé, un seul appel API sert des millions d'utilisateurs.

### Différenciateurs clés

- **Contextuel et adaptatif** : l'information s'adapte à l'intention (découverte ≠ assistance ≠ plein air)
- **Assistance offline** : numéros d'urgence en < 10ms, même sans réseau
- **"En bref" à la demande** : un LLM gratuit génère un résumé contextuel sur demande explicite — jamais automatique, pour préserver les quotas
- **Gratuit, sans pub, sans tracking** : architecture zéro coût, privacy by design
- **Open source** : MIT, auto-hébergeable sur n'importe quel VPS à 5$/mois
- **Navigation urgence via app native** : deep link `geo:LAT,LON` — zéro quota API, offline natif
- **Proxy durci** : rate limiting, circuit breaker, protection anti-abus — le budget API est protégé
- **Scalable à l'infini** : Cloudflare Edge supporte des millions d'utilisateurs sans changement de code

---

## 2. Utilisateurs cibles (Moments de vie)

> On ne conçoit pas pour des personas figées. On conçoit pour des **moments de vie** : le moment où tu es touriste, le moment où tu es perdu, le moment où tu randonnes.

### Moment 1 — Je découvre un lieu

> *"Je suis à Lisbonne, qu'est-ce que je fais de ma journée ?"*

| Attribut | Valeur |
|---|---|
| Contexte | En déplacement, pays inconnu, mobile |
| Besoin | Météo, restaurants, culture, transports — tout en un |
| Frustration | 5-6 apps différentes à ouvrir |
| Contexte activé | **Découverte** (défaut) |

### Moment 2 — Je suis en pleine nature

> *"Est-ce que je peux monter ce sommet aujourd'hui ?"*

| Attribut | Valeur |
|---|---|
| Contexte | En montagne, parfois hors connexion, 1 main dispo, gants |
| Besoin | Météo horaire, altitude, refuges, sentiers |
| Contrainte | Écran au soleil, gants, réseau dégradé |
| Contexte activé | **Plein air** |

### Moment 3 — J'ai besoin d'aide

> *"J'ai un problème médical au Japon, je ne parle pas japonais."*

| Attribut | Valeur |
|---|---|
| Contexte | Stress élevé, état cognitif dégradé, langue inconnue |
| Besoin | Numéro d'urgence local, hôpital le plus proche |
| Contrainte | Doit fonctionner SANS réseau, en < 3 secondes |
| Contexte activé | **Assistance** |

### Moment 4 — Je suis curieux

> *"Tiens, c'est quoi cette montagne au loin ?"*

| Attribut | Valeur |
|---|---|
| Contexte | Chez soi ou dehors, navigation lente et délibérée |
| Besoin | Histoire, culture, géographie, biodiversité |
| Comportement | Lit tout, compare, explore, note |
| Contexte activé | **Découverte** (défaut) |

### Moment 5 — Je m'installe quelque part

> *"Je déménage, c'est quoi ce quartier ?"*

| Attribut | Valeur |
|---|---|
| Contexte | Vie quotidienne, nouveaux arrivants |
| Besoin | Services, transports, qualité de l'air, écoles |
| Usage | Hebdomadaire |
| Contexte activé | **Découverte** (défaut) |

---

## 3. Fonctionnalités

### Légende des priorités

- **P1** — Critique : doit être dans le MVP. Sans ça, le produit ne peut pas être lancé.
- **P2** — Important : version 2. Le produit est utile sans, mais bien meilleur avec.
- **P3** — Souhaitable : enrichissement futur.

### 3.1 Les 3 contextes du MVP

Ces contextes sont des macro-priorités visibles, pas des silos rigides. Le produit doit rester capable d'absorber d'autres situations humaines via des règles d'adaptation internes sans multiplier les modes visibles.

#### Découverte (défaut)

Au clic sur un point :

| Donnée | Source | Délai cible | Cache |
|---|---|---|---|
| Nom et type du lieu | Nominatim (proxy KV) | < 300ms | 24h |
| Météo actuelle + 3 jours | Open-Meteo (CORS direct) | < 800ms | 30 min |
| Résumé Wikipedia | Wikipedia API (CORS) | < 1.5s | 12h |
| Photos géolocalisées | Wikimedia Commons (CORS) | < 2s | 12h |
| Lieux proches (top 5) | Overpass (proxy D1) | < 2s | 6h |
| En bref (à la demande) | Groq Llama 3.3 (proxy KV) | < 5s | 15 min |

#### Assistance

**Même panneau, même design.** Seul l'ordre du contenu change : les informations vitales remontent en haut.

| Donnée | Source | Délai | Réseau ? |
|---|---|---|---|
| Numéros d'urgence locaux | Bundle JS statique (50 KB) | **< 10ms** | **NON** |
| Hôpitaux proches | Overpass (proxy + D1) | < 2s | Oui (fallback cache) |
| Itinéraire vers hôpital | Deep link app native (`geo:LAT,LON`) | Immédiat | NON |
| Contacts ambassade | Dataset R2 statique | < 500ms | Oui (fallback cache) |

> **Design unifié** : L'interface d'assistance utilise les mêmes couleurs, typographies et marges que la découverte. Les boutons d'appel sont simplement plus grands (56×56px min) et positionnés en premier dans le panneau. Pas de fond rouge, pas de changement de palette.

> **Tolérance zéro sur la performance** : ce contexte doit fonctionner même en cas de connexion dégradée ou absente. Les numéros d'urgence sont affichés en < 10ms depuis le bundle JS — ZÉRO réseau. L'interface simplifie au maximum : contraste WCAG renforcé sur les boutons d'appel.

#### Plein air (P2)

| Donnée | Source | Cache |
|---|---|---|
| Profil altimétrique | OpenTopoData (D1) | Permanent |
| Météo horaire 16h | Open-Meteo (CORS) | 30 min |
| Sentiers de randonnée | Overpass (proxy D1) | 6h |
| Refuges, points d'eau | Overpass (proxy D1) | 6h |
| Alertes orageuses | Open-Meteo (CORS) | 5 min |

### 3.2 Contextes futurs (P2-P3)

#### Tourisme / Voyage (P2)

| Donnée | Source | Cache |
|---|---|---|
| POI touristiques avec horaires et prix | Overpass (proxy D1) | 6h |
| Transports en commun | Datasets GTFS dans R2, index D1 | Variable |
| Restaurants (type, prix, distance) | Overpass (proxy D1) | 6h |
| Infos culturelles (coutumes, pourboires, dress code) | Dataset R2 | 30 jours |
| Taux de change | Frankfurter API (CORS, 0 clé) | 6h |

#### Maritime (P3)

| Donnée | Source | Cache |
|---|---|---|
| Vagues et courants | Open-Meteo Marine (CORS) | 30 min |
| Vent en mer | Open-Meteo Marine (CORS) | 30 min |
| Ports de plaisance | Overpass (proxy D1) | 6h |
| Trafic navires AIS | aisstream.io (WebSocket direct) | Sans cache |

#### Data / Science (P3)

| Donnée | Source | Cache |
|---|---|---|
| Séismes temps réel | USGS GeoJSON (CORS) | KV 5 min |
| Épidémies mondiales | disease.sh (CORS) | KV 1h |
| Qualité de l'air (PM2.5, PM10, O3, NO2) | AQICN (proxy) | KV 45 min |
| Biodiversité (espèces observées) | GBIF (CORS) | D1 24h |
| Vols en temps réel | OpenSky Network (CORS, 400 crédits/jour) | Court |

### 3.3 Matrice d'adaptation flexible

Pour éviter l'explosion des modes, WorldLayer adapte l'expérience via une matrice interne plutôt que par ajout constant de nouvelles vues.

| Axe | Valeurs exemple | Effet UX |
|---|---|---|
| **Stress** | bas, moyen, élevé | Réduit ou augmente la densité et la taille des CTA |
| **Mobilité** | posé, en mouvement, une main, gants | Modifie la taille des zones tactiles et la quantité de texte |
| **Réseau** | bon, faible, absent | Change la politique de préfetch, de cache et de fallback |
| **Objectif** | découvrir, agir, comparer, rejoindre, vérifier | Change l'ordre des modules et la pill par défaut |
| **Environnement** | urbain, montagne, littoral, pays, zone dense | Fait émerger les sources et les blocs pertinents |
| **Horizon temps** | immédiat, aujourd'hui, séjour, installation | Change le ton et la profondeur de l'information |

> **Règle produit** : enrichir le produit par adaptation contextuelle, pas par accumulation de "modes" visibles ou de mini-applications.

### 3.4 Ce qui change selon le type de clic

L'information affichée dans le panneau s'adapte automatiquement :

| L'utilisateur clique sur... | Informations prioritaires |
|---|---|
| **Un bâtiment** (hôpital, restaurant) | Nom, adresse, horaires, téléphone, avis, distance, itinéraire, photos |
| **Un point en pleine nature** | Altitude, météo locale, terrain, risques, faune/flore |
| **Une ville** | Population, histoire (Wikipedia), transports, météo, attractions, coût de la vie |
| **Un pays** | Capitale, langue, monnaie, taux de change, n° urgence, visa, santé |
| **Une montagne / relief** | Altitude, profil topo, risques, météo en altitude, accès |
| **Un cours d'eau / lac / mer** | Qualité de l'eau, crues, activités nautiques, conditions météo |
| **Une zone urbaine dense** | Qualité de l'air, bruit, transports, services, prix immobilier |

### 3.5 "En bref" — Le résumé intelligent

Un bouton dans le panneau déclenche à la demande un résumé contextuel. L'utilisateur ne sait pas (et n'a pas besoin de savoir) que c'est généré par une IA.

> **Exemple — Contexte Plein air, clic sur les Alpes :**
> *"Vous êtes à 1 035 m d'altitude. Météo favorable jusqu'à 14h, orage prévu avec rafales à 60 km/h. Refuge du Couvercle à 2h30 de marche. Crampons recommandés au-dessus de 3 500 m."*
>
> Sous le résumé : *"Sources : Open-Meteo, OpenStreetMap, Wikipedia"*

| État | Visuel |
|---|---|
| Avant clic | Bouton `[✨ En bref]` — accent/terracotta |
| Chargement | Skeleton + shadow/glow pulsant (2-4s) |
| Affiché | Texte + sources en dessous |
| Indisponible | Bouton grisé + "Disponible demain" |
| Cache | Mis en cache 15 min par (coordonnées + contexte actif) dans KV |

#### Charte de data storytelling

Le résumé et les textes dérivés doivent respecter ces règles :

1. **Traduire, pas décorer** : transformer la donnée en signal utile.
2. **Toujours conserver la preuve** : une phrase seule n'est jamais suffisante.
3. **Rester court** : 1 à 3 phrases, pas plus.
4. **Être actionnable** : si une conséquence existe, la rendre explicite.
5. **Préférer le déterministe** : météo, altitude, urgence et risques simples ne doivent pas dépendre d'un LLM si une logique métier suffit.

Format cible :

- **Signal** : ce qui compte
- **Preuve** : valeur, seuil ou source
- **Conséquence** : ce que cela implique
- **Action** : si pertinente

### 3.6 Interface et navigation

| Feature | Description | Priorité |
|---|---|---|
| Carte vectorielle | MapLibre GL JS, style Warm Minimalism, WebGL | P1 |
| Styles de carte | Jour, nuit, terrain, satellite — bascule en 1 tap | P1 |
| Immersion Totale | Suppression de la Tab Bar classique pour une carte 100% plein écran | P1 |
| Recherche de lieu | Photon (OSM) avec autocomplétion | P1 |
| Bouton "Me localiser" | Centrage GPS | P1 |
| Panneau contextuel | Bottom sheet au clic (Peek → Mid → High → Full) | P1 |
| Pilules Contextuelles | Navigation "In-Sheet" pour filtrer les données sans changer de vue | P1 |
| Filtres / Menu | Panneau / Action Menu flottant pour activer/désactiver couches et contextes | P1 |
| Mode sombre / clair | Automatique (préférences système) | P1 |
| PWA installable | Service Worker + manifest | P1 |
| Écrans plein (full screen) | Pour infos pays, paramètres, profil | P1 |
| Téléchargement de zone | PMTiles depuis R2 | P2 |
| Recherche vocale | Reconnaissance vocale, mains libres | P3 |

#### Grammaire de navigation

Le produit distingue explicitement :

- **Contexte** : change la priorité globale du système
- **Pill** : change la section active du panneau
- **Filtre** : affine une liste ou une famille de données
- **Couche** : modifie la carte
- **Plein écran** : isole un contenu qui dépasse les capacités du panneau

Ces cinq concepts ne doivent jamais être confondus dans les specs, les tickets ou l'implémentation.

#### NarrativeHub (Le moteur de signal)

Le **NarrativeHub** est le composant d'intelligence qui traduit les données brutes en "Insights" actionnables. Il apparaît sous forme de cartes horizontales défilantes dans la section Signal.

- **Atmosphère** : Traduction de l'AQI en conseil de santé.
- **Identité** : Rappel de la langue locale et de la monnaie.
- **Mobilité** : Détection automatique des transports les plus proches.
- **Cycle Solaire** : Horaires de lever et coucher du soleil.
- **Sécurité & Environnement** : Alertes altitude (>2500m) et activité sismique récente.

Chaque Insight suit la structure : **Signal** (phrase humaine) + **Preuve** (donnée chiffrée).

---

#### Navigation & Turn-by-Turn (Délégation native)

Le produit ne gère pas directement le calcul d'itinéraire complexe ni le guidage vocal. Cette responsabilité est déléguée aux applications natives déjà installées sur l'appareil de l'utilisateur (Apple Maps, Google Maps, Waze).

- **Mécanisme** : Utilisation de Deep Links (`maps://`, `geo:`, `https://www.google.com/maps/...`).
- **Comportement** :
  - **Découverte** : Un bouton "Itinéraire" discret dans le panneau Signal.
  - **Assistance** : Un bouton "Y aller" proéminent (CTA Primaire) pour rejoindre les services d'urgence.
- **Avantages** : Zéro coût API, fonctionnement offline natif, interface familière pour l'utilisateur.

---

## 4. Stack technique

### 4.1 Frontend

| Technologie | Rôle |
|---|---|
| React + TypeScript | Base UI de l'application |
| Vite | Bundler et tooling de dev |
| MapLibre GL JS v5 | Moteur cartographique principal |
| Framer Motion | Mouvement et micro-interactions |
| TanStack Query | Cache client, prefetch, retry, déduplication |
| Zustand | État UI global : panneau, contexte, couches, sélection |
| Turf.js | Calculs géométriques côté client |
| Dexie.js (~35 KB) | Stockage offline structuré (phase 2/3) |
| deck.gl (optionnel, lazy) | Visualisation GPU uniquement pour gros overlays analytiques |

> **Règle frontend** :
> - `TanStack Query` gère les données distantes et leur cache de session
> - `Zustand` gère l'état d'interface et l'orchestration locale
> - `deck.gl` n'est pas un composant du MVP coeur. Il n'entre que si un cas de visualisation massive le justifie réellement

### 4.2 Architecture backend — séparation par responsabilités

Le projet ne doit pas dépendre d'un seul fournisseur pour toutes les responsabilités critiques. La stratégie retenue est **provider-aware mais anti-lock-in** :

| Couche | Rôle | Choix primaire | Alternative portable |
|---|---|---|---|
| **Compute / API** | Exposer les endpoints et agréger les sources | Cloudflare Workers + Hono | Deno Deploy, Node/Nitro, Fly.io |
| **Cache lecture global** | Réponses fréquentes, lecture rapide, partage mondial | Cloudflare KV | Redis/Valkey, cache HTTP/CDN |
| **Coordination forte** | Rate limits stricts, budgets, coalescing, verrou logique | Durable Objects | Redis, Postgres advisory locks, file de jobs |
| **Cache structuré / index** | Requêtes par zone, métadonnées, index légers | D1 | PostgreSQL/PostGIS |
| **Storage objets / datasets** | PMTiles, JSON statiques, assets géo | R2 | S3-compatible |
| **Traitement asynchrone** | warming, revalidation, batch, retry | Queues | Redis streams, RabbitMQ, BullMQ |

> **Règle absolue** : zéro appel direct depuis le client vers Overpass, Nominatim ou les APIs à clé. Tous passent par la couche API.

### 4.3 Hono et portabilité

Hono est retenu comme couche HTTP par défaut car il réduit le lock-in au lieu de l'aggraver :

- compatible runtimes edge et standards Web
- portable vers Cloudflare, Deno, Bun, Node et plusieurs plateformes serverless
- suffisamment léger pour rester proche du modèle `Request -> Response`

> **Décision** : on garde Hono. Le lock-in principal ne vient pas de Hono, mais des primitives d'infrastructure spécifiques au fournisseur.

### 4.4 Politique anti-lock-in

Chaque brique technique doit être pensée avec une interface logique stable :

1. **`CacheStore`** pour le cache lecture global
2. **`CoordinationStore`** pour budgets, compteurs, verrous, coalescing
3. **`ObjectStore`** pour les datasets et PMTiles
4. **`GeoIndexStore`** pour index et cache structuré
5. **`JobQueue`** pour warming et traitement asynchrone

Règles :

- le code métier ne dépend pas directement de KV, D1, R2 ou Queues
- les adaptateurs fournisseur vivent à la périphérie
- le runbook de bascule fournisseur doit rester possible sans réécriture du domaine métier

### 4.5 Doctrine des sources et données

Les APIs et datasets ne sont pas un détail d'implémentation. Ils constituent la matière première du produit.

Le système doit donc classer chaque source selon :

- sa valeur produit
- sa fiabilité opérationnelle
- ses contraintes d'usage
- son coût caché
- sa facilité de remplacement

#### Classes de criticité

| Classe | Définition | Règle |
|---|---|---|
| **A** | Source cœur produit, fiable, simple, difficile à éviter | Peut porter une fonctionnalité majeure |
| **B** | Source utile mais sous contrôle strict | Cache, timeout, fallback requis |
| **C** | Enrichissement ou différenciateur | Ne doit jamais bloquer le cœur UX |
| **D** | Source risquée, lourde ou prématurée | À repousser ou isoler |

#### Règles transverses

1. Aucune source externe unique ne doit porter seule une fonctionnalité critique.
2. Toute source `B`, `C` ou `D` doit avoir une politique explicite de cache, timeout et fallback.
3. Les données vitales doivent être locales, bundle, ou servies depuis une couche très stable.
4. Les données éditoriales et médias ne doivent jamais bloquer l'action principale.
5. Les sources fragiles ou communautaires doivent être considérées comme remplaçables.

### 4.6 Familles de sources

| Famille | Rôle produit | Exemples |
|---|---|---|
| **Cartographie et géographie** | Situer, nommer, décrire le lieu de base | OSM, Photon, Nominatim, PMTiles, GeoNames |
| **Météo et environnement** | Décrire les conditions et risques du lieu | Open-Meteo, OpenAQ, AQICN, Sunrise-Sunset |
| **Culture et découverte** | Donner du sens, de l'histoire, des visuels | Wikipedia, Wikidata, Wikimedia Commons |
| **Assistance et sécurité** | Aider vite, rassurer, orienter | emergency numbers, hôpitaux, ambassades |
| **Mobilité et transport** | Aller, revenir, se déplacer, comprendre les flux | GTFS, ORS, app native `geo:` |
| **Nature et outdoor** | Décider sur le terrain | Overpass outdoor, OpenTopoData |
| **Science et temps réel** | Enrichir et différencier | USGS, GBIF, disease.sh, OpenSky |
| **Vie quotidienne / installation** | Comprendre un quartier, une ville, une zone | services, air, commerces, coût de la vie |

### 4.7 Sources coeur produit

| Source | Famille | Classe | Usage principal | Règle opérationnelle |
|---|---|---|---|---|
| Open-Meteo | météo | **A** | météo actuelle, hourly, daily | Cache + budget + fallback |
| Photon | recherche | **A** | autocomplétion | Proxy/cache recommandé |
| Nominatim | géocodage inverse | **B** | coords -> nom lieu | Reverse uniquement, jamais autocomplete |
| Overpass | POI OSM | **B** | hôpitaux, refuges, lieux proches | Proxy + cache + budgets obligatoires |
| Wikipedia / Wikidata | culture | **A/B** | résumé, contexte, faits structurés | enrichissement non bloquant |
| Wikimedia Commons | culture média | **B** | photos géolocalisées | enrichissement, jamais critique |
| emergency numbers bundle | assistance | **A** | appel immédiat local | local, versionné, offline |
| app native `geo:` | mobilité urgence | **A** | navigation immédiate | zéro dépendance API externe |
| PMTiles / datasets statiques | géo / offline | **A** | carte portable, données locales | format portable, hébergement remplaçable |

### 4.8 Sources utiles mais secondaires

| Source | Famille | Classe | Usage | Règle |
|---|---|---|---|---|
| REST Countries | pays | **B** | langues, monnaies, métadonnées pays | bon candidat à snapshot interne |
| Frankfurter | change | **B** | taux de change | enrichissement voyage |
| OpenTopoData | outdoor | **B** | altitude, relief | utile mais pas vital |
| GTFS | transport | **B** | départs et transit | ingestion cadrée, villes ciblées |
| OpenAQ / AQICN | air quality | **B** | qualité de l'air | opportuniste, non universel |
| ambassades / consulats dataset | assistance | **B** | aide à l'étranger | dataset versionné et maintenu |
| Sunrise-Sunset | environnement | **C** | lever/coucher | enrichissement simple |

### 4.9 Sources d'enrichissement et différenciation

| Source | Famille | Classe | Usage | Règle |
|---|---|---|---|---|
| USGS Earthquake | science | **B/C** | séismes mondiaux | module temps réel, non critique |
| GBIF | biodiversité | **B/C** | espèces observées | excellent différenciateur futur |
| disease.sh | science | **C** | contexte sanitaire mondial | jamais cœur MVP |
| Open Food Facts | quotidien / culture | **C** | produits locaux | enrichissement contextuel |
| Météo-France Open Data | météo locale | **C** | précision FR | régional, non global |
| NASA POWER | climat | **C** | contexte analytique | cas spécifiques seulement |

### 4.10 Sources risquées ou à repousser

| Source | Famille | Classe | Usage potentiel | Risque principal |
|---|---|---|---|---|
| OpenSky | aviation | **D** | vols en temps réel | crédits et fraîcheur |
| aisstream | maritime | **D** | navires live | coût de complexité et bruit |
| sécurité quartier | quotidien | **D** | perception sécurité locale | très sensible, faible normalisation |
| trafic voiture live | mobilité | **D** | ETA / congestion | peu ouvert, fort lock-in |
| micromobilité multi-fournisseurs | mobilité | **D** | vélos / scooters | très morcelé |
| alertes pays par pays non normalisées | sécurité | **D** | crise locale | hétérogénéité forte |

### 4.11 APIs gratuites — Liste détaillée active

#### Données géographiques et cartographiques

| API / Service | Données | Clé ? | Limite gratuite | Appel | Cache |
|---|---|---|---|---|---|
| OpenFreeMap | Tuiles vectorielles mondiales | Non | Illimité | Direct | PMTiles R2 hebdo |
| Photon (Komoot) | Autocomplétion search-as-you-type OSM | Non | Public | Proxy recommandé | KV 24h |
| Nominatim (OSM) | Géocodage inverse uniquement (coords → nom) | Non | 1 req/s global | Proxy obligatoire | KV 24h |
| Overpass API | Objets OSM (hôpitaux, restaurants...) | Non | Fair use | Proxy obligatoire | D1 6h |
| OpenTopoData | Altitude de n'importe quel point GPS | Non | 1 000 req/jour | CORS direct | D1 permanent |
| OpenRouteService | Itinéraires non-urgence (Tourisme, Outdoor) | Oui (gratuit) | 2 000 req/jour | Proxy obligatoire | D1 par itinéraire |
| BAN France | Adresses françaises officielles (26M) | Non | Illimité | Direct | — |
| GeoNames | Noms géographiques, codes postaux, populations | Oui (gratuit) | Généreux | Dataset R2 | — |

#### Météo et conditions atmosphériques

| API / Service | Données | Clé ? | Limite | Appel | Cache |
|---|---|---|---|---|---|
| Open-Meteo | Météo complète 16j, historique, marine, qualité air | Non | Illimité | CORS direct | KV 30 min |
| Open-Meteo Marine | Vagues, courants, conditions maritimes | Non | Illimité | CORS direct | KV 30 min |
| Météo-France Open Data | Données officielles FR (AROME 1.3km) | Oui (gratuit) | Généreux | Proxy (clé) | KV variable |
| AQICN | Qualité de l'air temps réel (12 000 stations) | Oui (gratuit) | Généreux | Proxy (pas de CORS) | KV 45 min |
| NASA POWER | Données solaires et climatiques | Non | Illimité | CORS direct | — |
| Sunrise-Sunset API | Lever/coucher du soleil, phases de lune | Non | Illimité | CORS direct | — |

#### Connaissance et culture

| API / Service | Données | Clé ? | Limite | Appel | Cache |
|---|---|---|---|---|---|
| Wikipedia API | Résumés d'articles en 40+ langues | Non | Généreux | CORS direct | D1 12h |
| Wikidata | Données structurées (population, langue, monnaie...) | Non | Généreux | CORS direct | D1 12h |
| Wikimedia Commons | Photos géolocalisées (rayon 1 km urbain / 5 km terrain) | Non | Généreux | CORS direct | D1 12h |
| REST Countries | Données pays (250 pays) | Non | Illimité | Dataset R2 | Permanent |
| Open Food Facts | Produits alimentaires locaux, Nutri-Score | Non | Illimité | CORS direct | — |

#### Données temps réel et alertes

| API / Service | Données | Clé ? | Limite | Appel | Cache |
|---|---|---|---|---|---|
| USGS Earthquake | Séismes mondiaux (GeoJSON) | Non | Illimité | CORS direct | KV 5 min |
| disease.sh | Indicateurs épidémiologiques | Non | Illimité | CORS direct | KV 1h |
| OpenSky Network | Positions avions (ADS-B uniquement) | Non | 400 crédits/jour | CORS direct | Court |
| aisstream.io | Trafic navires AIS (WebSocket) | Oui (gratuit) | Généreux | WebSocket direct | Sans cache |
| OpenAQ | Qualité de l'air historique (30M mesures/jour) | Oui (gratuit) | Généreux | Proxy | KV 45 min |
| GBIF | Occurrences d'espèces (2.5 Mds) | Non | Généreux | CORS direct | D1 24h |
| Open Notify (ISS) | Position ISS temps réel | Non | Illimité | Direct | KV 30s |

#### Intelligence artificielle et synthèse

| API / Service | Données | Clé ? | Limite | Notes |
|---|---|---|---|---|
| Groq API (Llama 3.3 70B) | LLM synthèse contextuelle | Oui (gratuit) | ~1 000 req/jour, 6 000 tokens/min | À la demande uniquement. Cache KV 15 min |
| WebLLM (Phase 3) | LLM dans le navigateur via WebGPU | Non | Illimité (local) | iOS 26+, Chrome 121+, Firefox 141+ |
| Hugging Face Inference | 800+ modèles IA | Oui (gratuit) | Généreux | Traduction, NLP, vision |
| LibreTranslate | Traduction 30+ langues | Non (si self-hosted) | Illimité si self-hosted | Instance publique non garantie |

### 4.12 Architecture technique d'exécution

```
CLIENT
  MapLibre + UI + TanStack Query + Zustand
    ->
LAYER API
  Hono endpoints / orchestration
    ->
RESPONSABILITES
  1. Cache lecture global
  2. Coordination forte
  3. Cache structuré / index
  4. Object storage / datasets
  5. Appel source externe en dernier recours
```

Ordre de priorité :

1. servir depuis le bundle si possible
2. servir depuis le cache client si déjà vu dans la session
3. servir depuis le cache lecture partagé
4. servir depuis l'index structuré ou le storage localement disponible
5. faire un vrai appel source

### 4.13 Architecture de cache — 5 niveaux

```
NIVEAU 0 — Bundle statique (0ms, offline)
  Numéros d'urgence (150+ pays), codes pays, fuseaux horaires
  
NIVEAU 1 — TanStack Query (0ms si en session)
  Données vues dans cette session. Déduplication auto.
  
NIVEAU 2 — Cache lecture global (10-30ms, mondial)
  KV par défaut. Réponses partagées entre tous les utilisateurs.
  
NIVEAU 3 — Cache structuré / index requêtable (30-50ms)
  D1 par défaut. Requêtes par zone, index légers, cache géospatial.
  
NIVEAU 4 — Couche API + coordination
  Hono + coordination forte + coalescing.

NIVEAU 5 — Source externe réelle
  Appel API réel uniquement si N0-N3 vides.
  Dernier recours uniquement.
```

> **Règle de cohérence** :
> - le cache lecture global peut être eventually consistent
> - la coordination forte ne doit pas dépendre uniquement d'un cache eventually consistent

### 4.14 Classification des données par vélocité

#### Données statiques (changent rarement)

| Source | Fréquence | TTL | Stockage |
|---|---|---|---|
| Numéros d'urgence | ~1x par décennie | Permanent | Bundle JS |
| Frontières pays GeoJSON | Très rare | 30 jours | R2 |
| REST Countries (250 pays) | Rare | 30 jours | R2 |
| Wikipedia (histoire) | Quelques fois/an | 12h | D1 |
| Fuseaux horaires | Très rare | Permanent | Bundle JS |
| GeoNames | Mensuelle | 7 jours | R2 |

#### Données semi-dynamiques (stale-while-revalidate)

| Source | Fréquence | TTL | Stockage |
|---|---|---|---|
| Météo actuelle | Toutes les heures | 30 min | KV + TanStack |
| Prévisions 7 jours | Toutes les 6h | 2h | KV |
| POI Overpass | Semaines-mois | 6h | D1 géospatial |
| Qualité de l'air AQICN | Toutes les heures | 45 min | KV |
| Taux de change | Journalière | 6h | KV |
| Épidémies disease.sh | Journalière | 1h | KV |

#### Données temps réel

| Source | Fréquence | TTL | Offline |
|---|---|---|---|
| Séismes USGS | Quelques min | 5 min | Données KV cachées |
| Avions OpenSky | ~15s | Très court | Non disponible |
| Navires AIS | Temps réel | Sans cache | Non disponible |

### 4.15 Coordination forte et protection — 5 couches

| Couche | Outil | Protection |
|---|---|---|
| 1 — WAF | Cloudflare | 60 req/IP/min, Bot Fight, Browser Integrity |
| 2 — Rate limiting | Couche coordination | Par endpoint : geocode 30/min, places 20/min, ai 5/min, route 10/min |
| 3 — Circuit breakers | Par API tierce | Overpass: 3 err 5xx en 30s → fallback cache structuré |
| 4 — Budgets journaliers | Couche coordination | Nominatim 60k, Overpass 8k, Groq 800, ORS 1600, AQICN 500, OpenTopo 800 |
| 5 — Monitoring | Analytics Engine + Discord + Sentry | Alerte si budget > 80%. Alerte coût si > 3$/mois |

> **Décision** : les compteurs sensibles, budgets et verrous ne doivent pas dépendre uniquement de KV. Une couche de coordination forte est requise.

### 4.16 Datasets et storage objets

| Dataset | Taille | MAJ | Gain |
|---|---|---|---|
| PMTiles monde entier | ~100-120 GB | Hebdo (Cron) | Zéro dépendance OpenFreeMap |
| REST Countries | ~2 MB | Rare | 0 appel API en prod |
| Numéros d'urgence JSON | ~50 KB | Annuelle | Intégré bundle, zéro réseau |
| Fuseaux horaires | ~3 MB | Rare | Intégré bundle |
| Frontières GeoJSON | ~30 MB | Très rare | Servi depuis R2 |
| Codes IATA aéroports | ~5 MB | Mensuelle | Servi depuis R2 |
| GeoNames | ~300 MB | Hebdo | Index D1 |

Le format **PMTiles** est conservé car il reste portable entre R2 et des backends S3 compatibles.

### 4.17 Visualisation avancée : rôle réel de deck.gl

`deck.gl` n'est pas une dépendance obligatoire du produit.

Il n'est activé que pour des cas comme :

- heatmaps de forte densité
- nuages de points massifs
- overlays scientifiques
- couches de qualité de l'air, séismes, vols ou biodiversité à grande volumétrie

Sinon, le produit reste sur :

- MapLibre natif
- styles vectoriels
- couches GeoJSON raisonnables
- custom layers ciblées si besoin

> **Décision** : ne pas remplacer `deck.gl` par des frameworks de présentation. `Slidev` ou `reveal.js` sont valables pour la documentation, les démos et les présentations, pas pour le rendu analytique cartographique.

### 4.18 Coût complet

| Composant | 0-50k users/mois | 1M users/mois |
|---|---|---|
| Frontend (Cloudflare Pages) | 0 € | 0 € |
| Backend (Workers) | 0 € | ~5 $/mois minimum (plan Paid réaliste) |
| Cache lecture global | 0 € | variable selon lectures |
| Base (D1) | 0 € | 0 € |
| Storage objets (R2, 100 GB) | 0 € | ~1.50 $ + operations |
| Coordination / queues | 0 € | variable selon trafic et stratégie |
| Analytics Engine | 0 € | 0 € |
| Domaine | ~0.67 $/mois | ~0.67 $ |
| **TOTAL** | **~0 € prototype** | **à recalculer selon trafic, lectures, operations et coordination** |

> **Principe de coût** : le projet vise un coût faible, mais la documentation ne doit pas promettre un coût fixe irréaliste. Les lectures KV/R2, les opérations objets et la coordination peuvent peser davantage que le simple stockage.

### 4.19 Alternatives de déploiement et de résilience

| Couche | Primaire | Alternatives crédibles |
|---|---|---|
| Compute API | Cloudflare Workers + Hono | Deno Deploy, Node/Nitro, Fly.io |
| DB / index structuré | D1 | PostgreSQL / PostGIS, Supabase |
| Storage objets | R2 | S3-compatible |
| Coordination | Durable Objects / couche dédiée | Redis / Postgres / job queue |
| Queue async | Queues | Redis streams, RabbitMQ, BullMQ |

### 4.20 Auto-hébergement (optionnel)

| Service | Alternative self-hosted | Coût |
|---|---|---|
| Compute API | VPS Hetzner/OVH + Node/Nitro ou Deno | ~5-10 $/mois |
| Tuiles vectorielles | Martin (Rust) | Gratuit (open source) |
| Base de données / index | PostgreSQL + PostGIS | Supabase 500 MB gratuit |
| Storage objets | MinIO / S3-compatible | Variable |

---

## 5. Design System — Warm Organic Minimalism

### 5.1 Philosophie

| Principe | Application |
|---|---|
| **Un seul design, partout** | L'interface ne change jamais de forme ni de palette, quel que soit le contexte |
| **Simple en surface, puissant en dessous** | Montrer uniquement ce dont l'utilisateur a besoin maintenant |
| **Progressive disclosure** | L'info se révèle par paliers : Peek → Mid → High → Full |
| **Friction maîtrisée** | 1 tap pour les actions courantes, 2 taps max pour le reste, friction intentionnelle acceptable pour éviter l'erreur |
| **Vivant mais pas distrayant** | Micro-animations intentionnelles, jamais décoratives |

**Références visuelles :** L'intersection entre la chaleur de Craft, la densité de Flighty, et l'élégance cartographique de Felt.

### 5.2 Tokens couleur (Core System)

Les couleurs sont gérées via des variables CSS (`index.css`) et exposées dans Tailwind pour une cohérence absolue.

**Surfaces :**

| Token | Hex | Usage |
|---|---|---|
| `background` | `#FAFAF8` | Fond principal (Warm Bone) |
| `foreground` | `#1A1A1A` | Texte principal (Clean Black) |
| `card` | `#FFFFFF` | Surfaces élevées, cartes, panneaux |
| `secondary` | `#F4F1EC` | Zones encadrées, inputs, fonds secondaires |

**Accents (Brand) :**

| Token | Hex | Rôle | Usage |
|---|---|---|---|
| `accent/sage` | `#A7C4A0` | Nature, confiance | Signal, icônes actives, météo stable |
| `accent/terracotta` | `#C4785A` | Chaleur, action | CTA urgence, bouton "En bref", alertes |
| `accent/sky` | `#7AABCA` | Eau, info | Liens, humidité, culture |

---

### 5.3 Architecture Visuelle (Skill 3: Doppelrand)

L'application utilise la technique du **Double-Bezel** pour créer une profondeur physique sans utiliser d'ombres lourdes :
1. **Outer Ring** : `bg-black/5` (ou `white/5` en dark) + `ring-1` ultra-fin.
2. **Inner Content** : Surface `card` avec bordure subtile et ombre diffuse.

---

### 5.4 Typographie (Hiérarchie)

- **Titres (Lieux, Sections)** : `Instrument Serif` (Italique par défaut). Évoque le journalisme et l'élégance.
- **Interface (UI, Lecture)** : `Plus Jakarta Sans`. Moderne, géométrique et lisible.
- **Données (Code, Coords)** : `JetBrains Mono`. Précision technique.

---

### 5.5 Grammaire de Navigation (Modèle Spatial)

1. **Layer 0 (Map)** : 100% de l'écran. Canvas interactif.
2. **Layer 30 (Search)** : Barre flottante avec "Cognitive Eclipse" (disparaît quand le panneau est Focused).
3. **Layer 40 (Drawer)** : Hub d'intelligence avec 3 Snap Points (`35%`, `82%`, `100%`).
4. **Layer 60 (Action Menu)** : Commande centrale pour changer de contexte et de thème.

---

### 5.6 Typographie détaillée

**Polices :**

| Rôle | Police | Justification |
|---|---|---|
| Titres de lieux | **Instrument Serif** | Personnalité éditoriale et élégance |
| Interface et données | **DM Sans** | Lisibilité universelle et clarté |
| Valeurs techniques | **Geist Mono** | Coordonnées, altitude, codes, précision |

**Échelle :**

| Token | Taille / LH | Poids | Usage |
|---|---|---|---|
| `text/xs` | 9-11px | 400-700 | Badges, labels, tags |
| `text/sm` | 13/20 | 400 | Corps secondaire |
| `text/md` | 15/24 | 400 | **Corps principal** (défaut) |
| `text/lg` | 18/28 | 500 | Sous-titres |
| `text/xl` | 24/32 | 600 | Titres de sections |
| `text/2xl` | 32/40 | 600 | Titres de panneaux |
| `text/3xl` | 48/56 | 700 | Grands affichages (température) |
| `text/4xl` | 56/64 | 700 | Titres de lieux (mobile) |
| `text/5xl` | 64/72 | 700 | Titres de lieux (desktop) |

### 5.7 Composants critiques et états

Les composants de niveau 1 du système sont :

- Search bar
- Action Menu
- Bottom Sheet
- Pills
- CTA primaires
- Cards de données
- États système

Chaque composant doit être défini avec les états pertinents :

- default
- hover ou pressed
- focus
- disabled
- loading
- error si pertinent

### 5.8 Glassmorphism

Le glassmorphism (flou translucide) est réservé aux éléments flottants au-dessus de la carte : barre de recherche, contrôles carte et Action Menu. Les panneaux (bottom sheet), écrans pleins et modales utilisent un fond opaque pour garantir la lisibilité du contenu.

### 5.9 Mouvement

**Intentions :**

- Les panneaux glissent et apparaissent de manière fluide et naturelle (slide-up/down + fade)
- Le contenu se révèle progressivement (stagger) pour éviter l'effet "tout d'un coup"
- Les interactions (hover, tap) offrent un feedback visuel subtil
- Les skeletons animés indiquent le chargement sans bloquer l'interface
- Les transitions entre états du panneau (Peek → Mid → High → Full) sont fluides et continues

**Règles absolues :**

- Jamais d'animation en boucle quand l'utilisateur ne fait rien
- Toutes les animations respectent `prefers-reduced-motion`
- En contexte Assistance : animations réduites (pas supprimées)

---

## 6. Navigation & Composants

### 6.1 Architecture de navigation

La carte MapLibre occupe 100% de l'écran et constitue la toile de fond permanente. Pour minimiser la charge cognitive et garantir une immersion absolue, la "Tab Bar" inférieure classique est supprimée. Trois couches flottantes se superposent :

- **Barre de recherche / Action Menu** — flottante en haut, glassmorphism, autocomplétion Photon. Accès compact aux filtres, favoris et paramètres sans polluer l'écran.
- **Panneau contextuel (bottom sheet)** — glisse depuis le bas au clic sur un point. C'est le hub de présentation des données. L'Isolation Cognitive (Plein Écran) y est déclenchée si la donnée l'exige (graphiques lourds).
- **Pilules contextuelles (In-Sheet Navigation)** — défilement horizontal natif à l'intérieur du panneau sous le titre. Permet de naviguer dynamiquement entre 15+ sources de données (Météo, Culture, Santé) sans jamais accumuler de parchemin vertical infini et sans nécessiter de rechargements distrayants.

### 6.2 Panneau contextuel (Bottom Sheet) — Le composant central

> **Règle de composant** : le panneau est un composant système majeur. Toute nouvelle feature doit s'intégrer dans son anatomie avant d'introduire une vue autonome.

**États :**

| État | Hauteur | Déclencheur | Contenu |
|---|---|---|---|
| Fermé | 0% | Clic zone vide | — |
| **Peek** | 35% | Clic sur un point | Signal, briefing express, météo rapide |
| **Focused** | 82% | Swipe up depuis Peek | Météo détaillée, Tendances, Wikipedia |
| **Immersive** | 100% | Swipe up depuis Focused | Contenu complet, photos, Récit du territoire |

**Transitions :**
- Peek → Focused : swipe up OU tap sur le contenu
- Focused → Peek : swipe down léger
- Focused → Fermé : swipe down rapide (> 200px/s)
- Immersive → Focused : bouton retour ou swipe down
- Contexte Assistance : ouvre directement en **Focused** (82%)

**Contenu du panneau (contexte Découverte) :**

Le panneau affiche les sections via un système de "Rendu Conditionnel Contextuel", orchestré par les Pilules In-Sheet :

1. **En-tête Fixe** — Nom du lieu, type et localisation, distance et statut.
2. **La Barre de Pilules Dynamiques (In-Sheet Pills)** — S'invente selon le lieu cliqué (ex: `Météo Horaire`, `Histoire (Wiki)`, `Survie`, `Lieux proches`). Un clic sur une pilule transitionne le contenu inférieur sans casser le Bottom Sheet.
3. **Le Contenu (Data Storytelling)** — Révélation (stagger) de la donnée spécifique demandée, avec bouton "En bref" (LLM) toujours accessible pour résumer le contexte actif.
4. **Bouton Plein Écran (Isolation Cognitive)** — Uniquement affiché quand la donnée en vue (ex: Rapport météo sur 7 jours) nécessite un focus total loin de la carte.

**Contenu du panneau (contexte Assistance) :**

Le panneau s'ouvre directement en état **High** et affiche les informations vitales en priorité :

1. **En-tête** — Titre "Assistance" + pays et ville, même style que Découverte
2. **Boutons d'appel** — Numéros d'urgence locaux avec boutons d'appel proéminents (lien `tel:`)
3. **Hôpitaux proches** — Liste avec distance et bouton "Y aller" (deep link app native)
4. **Disclaimer** — Mention discrète : "Contenu informatif. En cas d'urgence réelle, appelez directement le [numéro]."

> **Design unifié** : Pas de fond rouge, pas de changement de palette. Même typographie, mêmes surfaces, mêmes ombres que le contexte Découverte. Les boutons d'appel utilisent `accent/terracotta`.

#### Règles d'anatomie

1. Header fixe avec identité du lieu et actions essentielles
2. Pills visibles au moins en `Mid` et `High`
3. Corps unique dédié à l'intention active
4. États système locaux et non intrusifs
5. CTA secondaires relégués après l'action principale

#### Règles de contenu

- une pill = une intention de lecture
- le contenu critique arrive avant la narration
- les erreurs restent locales à leur section
- les longues listes et graphes basculent en plein écran
- le panneau ne doit jamais devenir un parchemin infini

### 6.3 États du panneau

| État | Visuel | Comportement |
|---|---|---|
| **Chargement** | Skeleton animés | Nom affiché en premier (< 300ms), reste arrive progressivement |
| **Complet** | Contenu rempli | Stagger 50ms entre sections |
| **Erreur partielle** | Section masquée + label | "Météo temporairement indisponible" |
| **Hors ligne (cache)** | Données + date | "Dernière mise à jour : il y a 2h" |
| **Hors ligne (pas de cache)** | Message clair | "Connectez-vous pour explorer ce lieu" |
| **Zone isolée** | Contenu minimal | Altitude + météo. "Données limitées pour cette région" |

#### Politique offline

Le panneau distingue toujours :

- donnée fraîche
- donnée en cache
- absence de donnée

Le message reste humain et non technique.

### 6.4 Barre de recherche

- Glassmorphism (blur 16px, opacité 85%)
- Debounce 300ms après frappe
- 5 résultats max (Loi de Hick)
- Au tap résultat → carte centre + panneau s'ouvre en Peek
- Bouton ✕ efface tout

### 6.5 Filtres (ex-"Command Layer")

Déclenché par l'Action Menu ou un bouton dédié dans les contrôles carte. Le panneau de filtres permet de :

- **Changer de contexte** — Découverte, Aide, Plein air (le contexte actif est visuellement distingué)
- **Activer/désactiver des couches** — Météo, Santé, Restaurants, Photos, etc. via des toggles

> Les filtres n'ont pas le droit de modifier silencieusement la grammaire du panneau. Ils affinent, ils ne refondent pas.

### 6.6 États globaux

| État | Indicateur | Action |
|---|---|---|
| En ligne, tout OK | Aucun | — |
| En ligne, API dégradée | Label discret dans la section | "Dernière mise à jour : il y a Xh" |
| Hors ligne, cache dispo | Banner discret en haut | Données servies normalement |
| Hors ligne, pas de cache | Message clair | "Connectez-vous pour explorer" |
| GPS refusé | Dialogue OS + fallback | Champ de saisie manuelle |
| Première visite | Onboarding 3 écrans (skip) | 15 secondes max |

---

## 7. Spécifications techniques

### 7.1 Performance cibles

| Métrique | Cible | Conditions |
|---|---|---|
| FCP | < 1.2s | 4G, bundle < 550 KB |
| TTI | < 2.5s | deck.gl lazy loaded |
| Nom du lieu après clic | < 300ms | Cache KV chaud |
| Météo après clic | < 800ms | Open-Meteo direct |
| Panneau Mid complet | < 2s | Météo + Wikipedia |
| N° urgence (Assistance) | **< 10ms** | Bundle statique |
| "En bref" | < 5s | Groq depuis Europe |
| Carte 60 fps | Constant | iPhone 12+ |
| Bundle JS | < 550 KB gzip | Sans deck.gl |
| Lighthouse Perf | > 85 | Mobile |
| Lighthouse A11y | > 90 | WCAG 2.2 AA |

### 7.2 Cascade de chargement

| Étape | Délai | Source | Donnée |
|---|---|---|---|
| 1 — IMMÉDIAT | 0-300ms | Bundle + KV | Nom du lieu |
| 2 — RAPIDE | 300-800ms | Open-Meteo | Météo |
| 3 — ENRICHISSEMENT | 0.8-1.5s | Wikipedia | Résumé + photos |
| 4 — LIEUX | 1-2s | Overpass (proxy D1) | Top 5 proches |
| 5 — EN BREF | 1.5-5s | Groq (proxy KV) | À la demande |
| 6 — FOND | Async | USGS, AQICN | Séismes, air |

### 7.3 Gestion des erreurs

| Scénario | Comportement | Message affiché |
|---|---|---|
| API météo down | Cache + date | "Dernière mise à jour : il y a Xh" |
| Overpass lent | Skeleton + cache D1 expiré | "Chargement..." |
| Pas de connexion | Cache si dispo | "Hors ligne" |
| "En bref" quota épuisé | Bouton grisé | "Disponible demain" |
| Zone sans données | Contenu minimal | "Données limitées pour cette région" |
| GPS refusé | Saisie manuelle | "Où êtes-vous ?" |

> **Jamais** de message technique (`Error 503`, `fetch failed`). **Toujours** un message humain.

### 7.4 Accessibilité

| Critère | Spec |
|---|---|
| Contraste | Min 4.5:1 (AA). Boutons d'appel en Assistance : contraste renforcé |
| Zones tactiles | Min 44×44px. Boutons d'appel en Assistance : 56×56px |
| Navigation clavier | Tous les éléments interactifs, ordre logique |
| Textes alternatifs | `alt` ou `aria-label` partout |
| Lecteur d'écran | Rôles ARIA corrects |
| Réduction mouvement | `prefers-reduced-motion` respecté |

### 7.5 Ergonomie contextuelle

Le produit doit rester lisible et actionnable :

- en extérieur
- à une main
- en déplacement
- avec une charge cognitive dégradée
- avec un réseau faible ou absent

Quand le stress augmente :

- la densité baisse
- les CTA grossissent
- le texte se raccourcit
- les actions secondaires reculent

---

## 8. Risques et mitigations

### Techniques

| Risque | Prob. | Impact | Mitigation |
|---|---|---|---|
| Overpass ban/timeout | Haute | Haut | Proxy + D1 6h + Queues + circuit breaker |
| Abus du proxy | Moyenne | Critique | 5 couches protection (§4.6) |
| OpenFreeMap indisponible | Basse | Critique | PMTiles R2 hebdo auto. Basculement < 5 min |
| Quota Groq dépassé | Moyenne | Moyen | À la demande, budget 800/jour |
| Perf mobile bas de gamme | Moyenne | Haut | deck.gl lazy, densité POI réduite |

**Basculement OpenFreeMap :**

| Scénario | Action |
|---|---|
| Down < 1h | PMTiles R2 servent auto. Invisible pour l'utilisateur |
| Down > 1h | Vérifier GitHub. Alerte Discord déjà envoyée |
| Fermeture annoncée | Migrer Protomaps.io (même format). 1 variable d'env. < 2h |
| Contrôle total | Martin (Rust) sur VPS Hetzner ~5$/mois. 1 journée |

### Produit

| Risque | Mitigation |
|---|---|
| Surcharge d'information | Progressive disclosure stricte + tests utilisateurs |
| Info assistance introuvable | Tests stress simulé. KPI < 3s |
| Adoption faible | Open source, communauté OSM |

### Légaux

| Risque | Mitigation |
|---|---|
| Violation CGU API | Respect limites, proxy, budgets |
| Abus assistance | Disclaimer : "Contenu informatif" |
| RGPD géolocalisation | Consentement explicite, client-side uniquement |

---

## 9. Feuille de route

### Phase 1 — MVP (6-8 semaines)

> Critère : Nom + météo en < 2s. PWA installable. Proxy opérationnel.

- [ ] Carte MapLibre + style Warm Minimalism
- [ ] Action Menu flottant (filtres, favoris, paramètres, contextes)
- [ ] Clic point → Panneau Mid (nom, météo, Wikipedia)
- [ ] Clic pays → Plein écran (REST Countries R2)
- [ ] Proxy Hono.js (Overpass, Nominatim, Groq)
- [ ] Photon autocomplétion + cache KV
- [ ] Bouton "Me localiser"
- [ ] PWA (Service Worker + manifest)
- [ ] Mode sombre/clair auto
- [ ] Rate limiting + budgets (§4.6)
- [ ] `emergency_numbers.json` dans le bundle
- [ ] Gestion d'erreurs humaine

### Phase 2.A — Assistance & Plein air (4-6 sem.)

> Critère : N° urgence en < 3s offline. Tests utilisateurs validés.

- [ ] Contexte Assistance complet (numéros offline, hôpitaux, deep links)
- [ ] Tests utilisateurs Assistance (obligatoire)
- [ ] Contexte Plein air (topo, météo horaire, refuges)
- [ ] "En bref" à la demande (Groq)
- [ ] Photos Wikimedia Commons
- [ ] Filtres (contextes + couches)
- [ ] PMTiles R2 fallback
- [ ] Circuit breakers

### Phase 2.B — Tourisme (4-6 sem.)

- [ ] Attractions, restaurants, taux de change (Frankfurter)
- [ ] GTFS transports (5 villes)
- [ ] Qualité de l'air overlay (AQICN)
- [ ] Séismes temps réel (USGS)

### Phase 3 — Puissance & Offline (6-8 sem.)

- [ ] Téléchargement zones offline (PMTiles R2 + Dexie.js)
- [ ] Maritime (vagues Open-Meteo Marine, AIS navires aisstream.io)
- [ ] Science (épidémies disease.sh, biodiversité GBIF, vols OpenSky)
- [ ] "En bref" offline (WebLLM via WebGPU)
- [ ] Annotations locales
- [ ] Recherche vocale

---

## 10. Alternatives considérées

### Cartographie

| Alternative | Décision |
|---|---|
| Mapbox GL JS | REJETÉ : licence commerciale. MapLibre = fork open source |
| Leaflet.js | REJETÉ : pas de WebGL, perf limitée |
| Google Maps SDK | REJETÉ : coûts, dépendance, pas auto-hébergeable |
| CesiumJS | REJETÉ : trop lourd pour le cas d'usage |

### Géocodage

| Alternative | Décision |
|---|---|
| Nominatim autocomplétion | REJETÉ : CGU OSM interdisent search-as-you-type |
| Photon (Komoot) | RETENU : conçu pour search-as-you-type, auto-hébergeable |
| OpenCage | ALTERNATIVE : 2500 req/jour gratuit si Photon pose problème |

### Navigation

| Alternative | Décision |
|---|---|
| OpenRouteService | RETENU : 2000 req/jour, proxy + cache D1 |
| App native (deep link) | RETENU pour Assistance : `geo:LAT,LON`, zéro quota, offline |
| OSRM self-hosted | ALTERNATIVE sans quota : VPS, 10-30 GB |

### Stockage local

| Alternative | Décision |
|---|---|
| DuckDB-wasm | REJETÉ : 1.8-3.2 MB gzip, incompatible cible < 550 KB |
| Dexie.js | RETENU : ~35 KB gzip, API simple |
| localStorage | REJETÉ : 5 MB max, synchrone |

### IA

| Alternative | Décision |
|---|---|
| OpenAI / ChatGPT | REJETÉ : pas de tier gratuit généreux |
| Groq (Llama 3.3) | RETENU : ultra-rapide, tier gratuit |
| WebLLM | RETENU Phase 3 : 100% navigateur via WebGPU |

---

## 11. Tests

| Type | Outil | Cible |
|---|---|---|
| Unitaires | Vitest | Couverture > 70% |
| Intégration | Playwright + MSW | Clic → panneau, recherche, assistance |
| Proxy | Vitest + k6 | Rate limiting, circuit breakers |
| Performance | Lighthouse CI | Bloque merge si Perf < 80 ou A11y < 85 |
| Accessibilité | axe-core | 0 violation critical/serious |
| Offline/PWA | Playwright setOffline | Assistance sans réseau |
| Utilisateurs | Think aloud | 8/10 trouvent info assistance en < 3s |
| Régression API | Cron Workers 02:00 UTC | Alerte Discord si changement |

---

## 12. Métriques de succès

### Usage (3 mois)

| Métrique | Cible |
|---|---|
| Info assistance en < 3s | Oui |
| Taux completion panneau | > 60% |
| Rétention D7 | > 25% |
| Clics par session | > 5 |
| Erreurs visibles | < 0.5% |
| Stars GitHub | > 500 |

### Technique

| Métrique | Cible |
|---|---|
| Lighthouse Perf mobile | > 85 |
| Lighthouse A11y | > 90 |
| Cache hit | > 85% |
| Tests couverture | > 70% |
| Uptime | > 99.5% |
| Coût mensuel | < 3$/mois jusqu'à 500k users |

---

## 13. Comment contribuer

### Pour les développeurs

1. Forker le dépôt GitHub
2. Lire la documentation active : `README.md`, `MASTER_PRODUCT_SPEC.md`, `PRD.md`, `UX_UI_ARCHITECTURE_GLOBALE.md`
3. Choisir une issue prioritaire ou ouvrir une discussion de cadrage
4. Faire ses modifications sur une branche séparée
5. Vérifier les scripts réellement disponibles dans `package.json` avant de documenter ou lancer une procédure de test
6. Ouvrir une Pull Request avec une description claire et lister explicitement ce qui a été vérifié

### Pour les non-développeurs

- Signaler un bug ou une donnée incorrecte via les Issues GitHub
- Proposer une nouvelle feature en ouvrant une Discussion GitHub
- Améliorer la documentation (tutoriels, exemples, traductions)
- Contribuer à OpenStreetMap pour enrichir les données de base
- Participer aux tests utilisateurs Assistance — aucune compétence technique requise
- Partager le projet sur les réseaux sociaux

### Contact

- **GitHub** : à définir / référencer dans le dépôt réel
- **Discord** : à publier quand l'espace contributeurs sera ouvert
- **Documentation** : la documentation active vit actuellement dans ce dépôt
- **Statut** : la future page `/health` du proxy fera référence une fois l'infrastructure en place

---

> **WorldLayer — PRD v5.1 (Unifié) — Mars 2026 — Licence MIT**
> *La carte qui sait tout.*
