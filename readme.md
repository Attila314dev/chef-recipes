# Chef / MasterChef Studio

Egyszerű, stabil V1 receptkatalogizáló scaffold.

## Fő részek

- **Chef**: publikus, mobil-first receptlista és receptoldal
- **MasterChef Studio**: desktop-first szerkesztői felület, kliensoldali PIN gate-tel
- **Adatforrás**: `assets/data/recipes.json`
- **Mentés**: külön `api/save-recipes.js` endpointon át GitHub repo-ba

## Technológia

- HTML
- CSS
- Vanilla JavaScript
- ES modules
- Nincs framework
- Nincs build rendszer

## Fájlok

- `index.html` – publikus receptlista
- `recipe.html` – részletes receptnézet
- `studio.html` – login + dashboard + editor egy oldalon
- `assets/data/recipes.json` – közös adatmodell
- `api/save-recipes.js` – minimális save endpoint

## Helyi futtatás

Mivel a projekt ES module-okat és JSON fetch-t használ, egyszerű statikus szerverrel futtasd.

Példák:

### Python
```bash
python -m http.server 8080
