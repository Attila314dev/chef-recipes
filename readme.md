# Chef / MasterChef Studio

Statikus, mobil-first receptkatalogizáló webalkalmazás szakácsok számára.

## Nézetek

- **Chef** → publikus, böngészésre optimalizált nézet
- **MasterChef Studio** → kliensoldali szerkesztő JSON import/exporttal

## Technológia

- HTML
- CSS
- Vanilla JavaScript
- JSON adatforrás
- GitHub Pages kompatibilis

## Fő funkciók

- receptlista kártyás nézetben
- szabad szavas keresés
- mobilos szűrőpanel
- kattintható attribútumok a részletes oldalon
- kapcsolódó receptek
- MasterChef Studio jelszavas kliensoldali belépéssel
- dinamikus összetevő és lépés kezelés
- live JSON preview
- JSON import / export
- localStorage draft mentés

## Jelszó konfigurálása

Az egyszerű kliensoldali jelszó az `auth.js` fájlban állítható:

```js
const MASTERCHEF_AUTH = {
  password: 'masterchef2026',
  storageKey: 'masterchef_authorized',
  sessionHours: 8
};
