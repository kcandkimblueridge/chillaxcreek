# chillaxcreek.com

Static marketing site for [Chillax Creek](https://chillaxcreek.com), a vacation cabin in Blue Ridge, Georgia.

## Stack

- [Astro](https://astro.build) — static site generator
- Bootstrap 5 + Swiper.js (via CDN) — preserved from the original WordPress theme
- [Formspree](https://formspree.io) — contact form + newsletter form delivery
- [OwnerRez](https://ownerreservations.com) — embedded availability/booking widget
- GitHub Pages — hosting (custom domain via `public/CNAME`)

## Local development

```sh
npm install
npm run dev   # http://localhost:4321
```

## Build

```sh
npm run build       # writes static site to dist/
npm run preview     # preview the built output
```

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the site and publishes to GitHub Pages. The custom domain `chillaxcreek.com` is configured via `public/CNAME` and DNS pointing at GitHub Pages.

## Configuration to fill in before launch

Two Formspree form IDs need to be set:

- `src/components/ContactForm.astro` — replace `FORMSPREE_CONTACT_ID`
- `src/components/NewsletterForm.astro` — replace `FORMSPREE_NEWSLETTER_ID`

The OwnerRez widget ID (`09c4bbd5356a4738a333fb872cbe297d`) is in `src/components/OwnerRezWidget.astro` and matches the original site.

## Project structure

```
src/
├── components/    Reusable Astro components (Header, Footer, ContactForm, etc.)
├── layouts/       BaseLayout wraps every page
├── pages/         One .astro file per route
├── styles/        Original chillax theme CSS (style.css, responsive.css)
└── photos.json    Manifest of cabin photos with captions
public/
├── CNAME          Custom domain
├── images/        Logo, hero, decorations
└── photos/        45 cabin photos
```
