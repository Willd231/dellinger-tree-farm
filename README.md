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
- `data/inventory.json`: the "What We Grow" list (no prices). Edit by hand.
- `api/contact.js`: emails form inquiries via Resend (env: `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`)
- `images/`: put photos in `images/gallery/`

## Still to do
- [x] Real photos (about + gallery)
- [ ] Logo from the sign
- [ ] Business hours
- [ ] Order minimum (FAQ)
- [ ] Confirm the What We Grow plant list
- [x] Contact form emails (Resend)
- [x] GoDaddy domain → Vercel
