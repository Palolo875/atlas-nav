toolName: todo_write
            
status: success
          
Todos updated: 3 items
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 3 items
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 3 items
          
Voici la **matrice stratégique des visualisations** pour Atlas Nav. Elle définit exactement ce qui doit être construit, avec quelle technologie, et pourquoi, afin d'obtenir le rendu "premium" des références que tu as partagées, sans tomber dans le "générique" ni créer de la dette technique inutile.

---

### 🌍 1. La Base Spatiale : La Carte
*La carte n'est pas un graphique, c'est l'environnement dans lequel vit la donnée.*

- **Outil :** `MapLibre GL JS` (Déjà en place)
- **Ce qu'on fait :** Projection de points (épicentres, observations), clusters, halos (glows), et changement de fonds de carte (clair/sombre).
- **Pourquoi pas ECharts ou D3 ?** Parce qu'on a besoin d'une vraie navigation spatiale fluide (zoom, pan, pitch) avec des tuiles vectorielles. D3 est trop lourd pour ça, et ECharts est trop rigide pour l'intégration avec notre Drawer.

---

### 🌋 2. Dataset : Activité Sismique
*L'objectif est de montrer le rythme et l'intensité.*

**A. La Chronologie (Timeline des 30 jours)**
- **Outil :** `Recharts` (Déjà en place, mais à polir)
- **Le rendu visuel :** Un graphique en barres (BarChart) très épuré. Pas d'axes visibles, pas de grille. Juste des barres dont la hauteur = magnitude, et la couleur = dangerosité (pastel jaune/rouge).
- **Pourquoi Recharts ?** C'est une distribution temporelle simple. Recharts gère parfaitement ça avec `<BarChart>` si on désactive toutes les options par défaut génériques.

**B. La Répartition par Profondeur (Nouveau)**
- **Outil :** `D3.js` + SVG
- **Le rendu visuel :** Un "Beeswarm plot" (nuage d'abeilles) horizontal. Chaque séisme est un cercle qui flotte le long d'un axe de profondeur, avec un rayon lié à la magnitude.
- **Pourquoi D3 ?** Recharts ne sait pas faire de "force layout" (simulation physique pour que les cercles ne se chevauchent pas). C'est typiquement une viz "signature" qui donne un effet "Wahou".

---

### 🌿 3. Dataset : Nature & Biodiversité (GBIF)
*L'objectif est de montrer la richesse et la proportion.*

**A. La Jauge de Biodiversité (La vue d'ensemble)**
- **Outil :** `D3.js` + SVG
- **Le rendu visuel :** Un "Donut chart" très épais, organique, avec des bords arrondis (corner radius sur les arcs). Au centre, un grand chiffre en typographie serif (ex: "45 espèces"). Les arcs ont des couleurs sémantiques douces.
- **Pourquoi D3 ?** Recharts propose un `<PieChart>`, mais il est difficile de lui donner cet aspect "sculpté" et organique (arrondis parfaits, espacements fluides) propre aux apps premium. D3 avec `d3-shape` (`d3.arc()`) permet un contrôle au pixel près.

**B. Le Top 3 Visuel & Nuage d'espèces**
- **Outil :** `React` pur (CSS / Tailwind)
- **Le rendu visuel :** Pas de chart. Des "pilules" (badges) de tailles différentes flottant dans un conteneur.
- **Pourquoi React pur ?** C'est du layout flex/wrap dynamique, pas besoin d'une librairie de dataviz pour ça.

---

### ⛅ 4. Dataset : Météo & Qualité de l'Air
*L'objectif est la lecture instantanée de l'évolution.*

**A. Courbe de Température Journalière**
- **Outil :** `Recharts`
- **Le rendu visuel :** Une courbe adoucie (`type="monotone"`) avec un dégradé (gradient) en dessous. Aucun axe Y visible. Les températures min/max sont annotées directement sur la courbe.
- **Pourquoi Recharts ?** C'est le cas d'usage parfait pour `<AreaChart>`. Avec les bons `stops` SVG pour le gradient, le rendu sera très élégant.

**B. Jauges AQI (Air) et UV**
- **Outil :** `D3.js` (ou SVG pur)
- **Le rendu visuel :** Une demi-lune (semi-cercle) avec une aiguille ou un curseur, remplie d'un dégradé de couleurs (vert → jaune → rouge).
- **Pourquoi D3/SVG ?** Recharts n'est pas conçu pour faire des "Speedometers" (compteurs de vitesse) élégants. Un composant SVG custom avec une jauge dessinée via `d3.arc()` sera beaucoup plus fin.

---

### 📖 5. Dataset : Histoire & Culture
*L'objectif est la narration, pas la data pure.*

- **Outil :** `React` + `Tailwind Typography` (Déjà en place)
- **Le rendu visuel :** Mise en page éditoriale. Grande image, texte aéré, citations.
- **Pourquoi pas de viz ?** Parce que l'histoire se lit, elle ne se graphise pas (sauf si on avait une timeline historique, ce qui n'est pas le cas avec l'API Wiki actuelle).

---

### 📋 Résumé du Plan d'Action (Ce qu'il faut coder)

Pour atteindre le niveau de tes références, voici les **composants exacts** que nous allons devoir créer :

1.  **`TimelineChart` (Recharts) :** Pour les séismes. Déjà commencé, on va le pousser à fond.
2.  **`TemperatureArea` (Recharts) :** Pour la météo. Remplacera la liste brute actuelle.
3.  **`OrganicDonut` (D3.js) :** Pour la biodiversité. La pièce maîtresse visuelle.
4.  **`GaugeArc` (D3.js/SVG) :** Pour l'indice UV et l'AQI.

Si cette matrice te convient, je propose qu'on commence par la pièce la plus impactante visuellement : **installer D3.js et créer le `OrganicDonut` pour l'onglet Nature**, afin de remplacer le BarChart basique actuel par une vraie visualisation "signature". Qu'en dis-tu ?