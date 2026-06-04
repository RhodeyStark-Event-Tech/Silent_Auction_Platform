# Item photos

Drop auction-item images in this folder. They're served from the site root, so
a file here named `twins.jpg` is reachable at `/items/twins.jpg`.

To attach one to an item: admin dashboard → edit the item → **Image** field →
enter the path, e.g. `/items/twins.jpg` (a full `https://…` URL also works).

Tips:
- Use web-friendly files (`.jpg`/`.png`/`.webp`) and reasonable sizes
  (roughly ≤ 500 KB each) so the page loads fast.
- Filenames are case-sensitive in production — keep them lowercase, no spaces
  (use hyphens), and match the path you enter exactly.

This README just keeps the folder in git; it isn't served as a page.
