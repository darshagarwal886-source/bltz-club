# BLTZ.CLUB — Cricket Tournament

Open the `bltz-club` folder in VS Code, then right-click `index.html` > **Open with Live Server**
(or just double-click `index.html`; it works from file:// too).

## Structure
- `index.html` — page markup
- `css/style.css` — styles
- `js/app.js` — app logic, editor, scorecards
- `js/data.js` — teams, players, matches (the tournament data)

## Editor
Click **Editor** and enter the editor password (set in `js/app.js` as `PASS`).
Changes are saved in the browser's localStorage when you press **Save**.

## Making edits visible to everyone
localStorage is per-browser. To publish updates for all visitors:
1. Press Save in the editor.
2. Open the browser console and run `bltzExport()` — this downloads `data.js`.
3. Replace `js/data.js` with it and re-deploy (GitHub Pages, Netlify, etc.).
