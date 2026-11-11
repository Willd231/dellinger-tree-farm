# Dellinger Tree Farm: website (draft)

Static site (HTML/CSS/JS) plus one Vercel serverless function. No build step.

## Run locally
    npx serve .            # or: python -m http.server 8000
The contact form's `/api/contact` only runs on Vercel (or `vercel dev`). Locally it falls back to a prefilled email link.

## Deploy
Import the repo in Vercel. Framework preset: **Other**. No build command. Add the GoDaddy domain later under Project → Domains.

## Layout
- `index.html`: all sections (About, Inventory, Delivery, Gallery, FAQ, Contact, Map)
- `css/styles.css`: colors are at the top (`--sage`, `--forest`), matched to the sign
- `js/main.js`: menu, scroll effects, inventory search/filter, contact form
- `data/inventory.json`: **sample** inventory. Replace with Zoho feed (`INVENTORY_URL` in main.js)
- `api/contact.js`: form endpoint, Zoho TODO
- `images/`: put photos in `images/gallery/`

## Still to do
- [ ] Real photos (about + gallery), logo from the sign
- [ ] Business hours
- [ ] Order minimum (FAQ)
- [ ] Zoho: inventory feed (`/api/inventory`) + form → Zoho leads
- [ ] Confirm email address is `@gmail.com`
- [ ] GoDaddy domain → Vercel
# dellinger-tree-farm
