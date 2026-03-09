# Publishing — Chrome Web Store

Prepared texts and justifications for Chrome Web Store submission.

## Extension Listing

### Name
Tilr

### Short Description (132 chars max)
Split your browser into layouts (columns, rows, grid) for comfortable multi-window webapp testing. No data collection.

### Detailed Description (English)
Tilr lets you organize your browser windows into predefined screen layouts with a single click. Choose between two columns (1x2), two rows (2x1), a 2x2 grid, or a 3x2 grid (6 windows), and Tilr will automatically position your windows to fill the screen.

Each panel is a real browser window with full capabilities — no iframes, no limitations.

Resize any window and the others adjust automatically to keep the layout perfectly synchronized — no gaps, no overlaps. The layout stays consistent whether you're fine-tuning proportions or working across multiple monitors with independent layouts on each screen.

Designed for web developers, QA testers, and anyone who needs to view multiple webapps side by side without manually resizing and dragging windows.

Features:
- Four layout modes: two columns, two rows, 2x2 grid, and 3x2 grid (6 windows)
- Dynamic resizing: drag any window edge and all adjacent windows adapt instantly
- Independent multi-monitor support: run different layouts on each screen simultaneously
- Distribute your open tabs across layout windows automatically
- One-click restore to regroup all tabs into one window
- Windows managed as a group with automatic cleanup
- Multilingual: 12 languages (English, Spanish, Catalan, Galician, Basque, German, French, Italian, Portuguese, Danish, Finnish, Dutch)
- No data collection, no analytics, no external connections
- Open source (GPL v3)

### Category
Developer Tools

### Language
English (default), Spanish, Catalan, Galician, Basque, German, French, Italian, Portuguese, Danish, Finnish, Dutch

### Privacy Policy URL
https://github.com/aaronFortuno/Tilr/blob/main/PRIVACY.md

## Permission Justifications

These texts are ready to paste into the "Justify permissions" field during Chrome Web Store review.

### `system.display`
> Used to retrieve the dimensions and position of the user's active display (work area, excluding taskbar/dock). This information is required to calculate the exact pixel coordinates for positioning browser windows in the selected layout (columns, rows, or grid). No display information is stored, transmitted, or used for any purpose other than window positioning.

### `storage`
> Used to persist the IDs of windows created by the extension during a layout session. This allows the "Restore" feature to regroup all layout windows back into a single window, and enables automatic cleanup when windows are closed. Only internal window IDs and the layout type are stored locally. No user data, browsing history, or personal information is stored.

### `tabs`
> Used to query the user's open tabs in layout windows and move them back to the primary window during restore. The extension does not read tab URLs, titles, or page content. Tab access is limited to moving tabs between windows managed by the extension.

## Privacy Practices

For the Chrome Web Store privacy tab:

### Single Purpose Description
> Tilr positions browser windows in predefined screen layouts (two columns, two rows, or 2x2 grid) to help users work with multiple windows side by side.

### Data Usage Disclosure
- **Does not collect any user data**
- **Does not transmit any data to external servers**
- **Does not use analytics or tracking**
- **Does not access page content, URLs, or browsing history**
- **All data (window IDs for group management) is stored locally and cleared when the layout is restored**

### Remote Code
- **Does not use remote code** — all code is bundled in the extension package

---

## Translated Descriptions

### Descripción detallada (Español)
Tilr te permite organizar las ventanas de tu navegador en layouts predefinidos con un solo clic. Elige entre dos columnas (1x2), dos filas (2x1), una cuadrícula 2x2 o una cuadrícula 3x2 (6 ventanas), y Tilr posicionará automáticamente las ventanas para llenar la pantalla.

Cada panel es una ventana real del navegador con todas sus funcionalidades — sin iframes, sin limitaciones.

Redimensiona cualquier ventana y las demás se ajustan automáticamente para mantener el layout perfectamente sincronizado — sin huecos, sin solapamientos. El layout se mantiene consistente tanto si estás ajustando proporciones como si trabajas con varios monitores con layouts independientes en cada pantalla.

Diseñado para desarrolladores web, testers QA y cualquier persona que necesite ver varias webapps lado a lado sin redimensionar y arrastrar ventanas manualmente.

Características:
- Cuatro modos de layout: dos columnas, dos filas, cuadrícula 2x2 y cuadrícula 3x2 (6 ventanas)
- Redimensionado dinámico: arrastra el borde de cualquier ventana y las adyacentes se adaptan al instante
- Soporte multi-monitor independiente: usa layouts diferentes en cada pantalla simultáneamente
- Distribuye tus pestañas abiertas entre las ventanas del layout automáticamente
- Restauración con un clic para reagrupar todas las pestañas en una sola ventana
- Gestión de ventanas como grupo con limpieza automática
- Multilingüe: 12 idiomas (inglés, español, catalán, gallego, euskera, alemán, francés, italiano, portugués, danés, finés, neerlandés)
- Sin recopilación de datos, sin analíticas, sin conexiones externas
- Código abierto (GPL v3)

### Descripció detallada (Català)
Tilr et permet organitzar les finestres del navegador en layouts predefinits amb un sol clic. Tria entre dues columnes (1x2), dues files (2x1), una graella 2x2 o una graella 3x2 (6 finestres), i Tilr posicionarà automàticament les finestres per omplir la pantalla.

Cada panell és una finestra real del navegador amb totes les funcionalitats — sense iframes, sense limitacions.

Redimensiona qualsevol finestra i les altres s'ajusten automàticament per mantenir el layout perfectament sincronitzat — sense buits, sense solapaments. El layout es manté consistent tant si estàs ajustant proporcions com si treballes amb diversos monitors amb layouts independents a cada pantalla.

Dissenyat per a desenvolupadors web, testers QA i qualsevol persona que necessiti veure diverses webapps costat a costat sense redimensionar i arrossegar finestres manualment.

Característiques:
- Quatre modes de layout: dues columnes, dues files, graella 2x2 i graella 3x2 (6 finestres)
- Redimensionat dinàmic: arrossega la vora de qualsevol finestra i les adjacents s'adapten a l'instant
- Suport multi-monitor independent: utilitza layouts diferents a cada pantalla simultàniament
- Distribueix les pestanyes obertes entre les finestres del layout automàticament
- Restauració amb un clic per reagrupar totes les pestanyes en una sola finestra
- Gestió de finestres com a grup amb neteja automàtica
- Multilingüe: 12 idiomes (anglès, castellà, català, gallec, èuscar, alemany, francès, italià, portuguès, danès, finès, neerlandès)
- Sense recollida de dades, sense analítiques, sense connexions externes
- Codi obert (GPL v3)

### Description détaillée (Français)
Tilr vous permet d'organiser les fenêtres de votre navigateur en dispositions prédéfinies en un seul clic. Choisissez entre deux colonnes (1x2), deux lignes (2x1), une grille 2x2 ou une grille 3x2 (6 fenêtres), et Tilr positionnera automatiquement vos fenêtres pour remplir l'écran.

Chaque panneau est une vraie fenêtre de navigateur avec toutes ses fonctionnalités — pas d'iframes, aucune limitation.

Redimensionnez n'importe quelle fenêtre et les autres s'ajustent automatiquement pour garder la disposition parfaitement synchronisée — pas d'espaces vides, pas de chevauchements. La disposition reste cohérente que vous ajustiez les proportions ou que vous travailliez sur plusieurs écrans avec des dispositions indépendantes sur chacun.

Conçu pour les développeurs web, les testeurs QA et tous ceux qui ont besoin de visualiser plusieurs webapps côte à côte sans redimensionner et déplacer manuellement les fenêtres.

Fonctionnalités :
- Quatre modes de disposition : deux colonnes, deux lignes, grille 2x2 et grille 3x2 (6 fenêtres)
- Redimensionnement dynamique : faites glisser le bord d'une fenêtre et les fenêtres adjacentes s'adaptent instantanément
- Support multi-écran indépendant : utilisez des dispositions différentes sur chaque écran simultanément
- Distribuez vos onglets ouverts entre les fenêtres automatiquement
- Restauration en un clic pour regrouper tous les onglets dans une seule fenêtre
- Gestion des fenêtres en groupe avec nettoyage automatique
- Multilingue : 12 langues (anglais, espagnol, catalan, galicien, basque, allemand, français, italien, portugais, danois, finnois, néerlandais)
- Aucune collecte de données, pas d'analytique, aucune connexion externe
- Open source (GPL v3)

### Detaillierte Beschreibung (Deutsch)
Mit Tilr organisierst du deine Browserfenster mit einem einzigen Klick in vordefinierte Bildschirm-Layouts. Wähle zwischen zwei Spalten (1x2), zwei Zeilen (2x1), einem 2x2-Raster oder einem 3x2-Raster (6 Fenster) — Tilr positioniert deine Fenster automatisch, um den Bildschirm auszufüllen.

Jedes Panel ist ein echtes Browserfenster mit vollem Funktionsumfang — keine iframes, keine Einschränkungen.

Ändere die Größe eines beliebigen Fensters und die anderen passen sich automatisch an, um das Layout perfekt synchron zu halten — keine Lücken, keine Überlappungen. Das Layout bleibt konsistent, egal ob du Proportionen feinjustierst oder mit mehreren Monitoren arbeitest, die jeweils unabhängige Layouts haben.

Entwickelt für Webentwickler, QA-Tester und alle, die mehrere Webapps nebeneinander betrachten möchten, ohne Fenster manuell zu verschieben und in der Größe anzupassen.

Funktionen:
- Vier Layout-Modi: zwei Spalten, zwei Zeilen, 2x2-Raster und 3x2-Raster (6 Fenster)
- Dynamische Größenanpassung: Ziehe den Rand eines Fensters und die angrenzenden Fenster passen sich sofort an
- Unabhängiger Multi-Monitor-Support: verwende verschiedene Layouts auf jedem Bildschirm gleichzeitig
- Verteile deine geöffneten Tabs automatisch auf die Layout-Fenster
- Wiederherstellung mit einem Klick, um alle Tabs in einem Fenster zusammenzuführen
- Fensterverwaltung als Gruppe mit automatischer Bereinigung
- Mehrsprachig: 12 Sprachen (Englisch, Spanisch, Katalanisch, Galicisch, Baskisch, Deutsch, Französisch, Italienisch, Portugiesisch, Dänisch, Finnisch, Niederländisch)
- Keine Datenerfassung, keine Analytik, keine externen Verbindungen
- Open Source (GPL v3)
