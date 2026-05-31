# Gallery & hero photos

Drop Ashleigh's photos here, then they appear automatically on the site.

Expected files (referenced from `client/src/content.ts`):

- `../hero.jpg` — main portrait at the top of the page (place in `client/public/hero.jpg`)
- `photo1.jpg` … `photo5.jpg` — the 5 gallery photos (place in this folder)

Until a file exists, the site shows a friendly "📷 Photo coming soon" placeholder
in its place — nothing breaks. You can rename the expected paths or alt text in
`client/src/content.ts`.
