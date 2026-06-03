# Exporting winners to Google Sheets

The admin dashboard's **"Export to Google Sheets"** button (Winners tab) sends
one row per winning bidder to a Google Sheet. It works via a small **Google
Apps Script web app** attached to your sheet — no Google Cloud project or
service account needed.

Each export **overwrites** the sheet with a fresh snapshot of the current
winners (so clicking it twice never creates duplicates).

## Columns written

| Exported At | Winner Name | Email | Phone | Items Won | Total Owed | Donor Contacts |
|---|---|---|---|---|---|---|

- **Items Won** — `Twins Tickets ($125); Wine Basket ($45)`
- **Total Owed** — sum of that bidder's winning bids
- **Donor Contacts** — `Twins Tickets: Eric Reimer …; Wine Basket: Patty Douglas`

## One-time setup

### 1. Create the sheet + script
1. Create a new Google Sheet (name it e.g. *Auction Winners*).
2. **Extensions → Apps Script.**
3. Delete any boilerplate and paste the script below.
4. Change `SECRET` to a long random string — **remember it**, you'll reuse it as
   `SHEETS_WEBHOOK_SECRET`.
5. Click **Save**.

```javascript
// Apps Script bound to your Google Sheet. Receives winner rows and rewrites
// the "Winners" tab. Deploy as a Web App (see steps below).
const SECRET = 'choose-a-long-random-string'; // must equal SHEETS_WEBHOOK_SECRET

function doPost(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse(e.postData.contents);
    if (SECRET && body.secret !== SECRET) {
      return out.setContent(JSON.stringify({ error: 'unauthorized' }));
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Winners') || ss.insertSheet('Winners');
    sheet.clearContents();
    sheet.appendRow(['Exported At', 'Winner Name', 'Email', 'Phone', 'Items Won', 'Total Owed', 'Donor Contacts']);

    var now = new Date();
    (body.rows || []).forEach(function (r) {
      sheet.appendRow([now, r.name, r.email, r.phone, r.items, r.total, r.donorContacts]);
    });

    return out.setContent(JSON.stringify({ ok: true, count: (body.rows || []).length }));
  } catch (err) {
    return out.setContent(JSON.stringify({ error: String(err) }));
  }
}
```

### 2. Deploy as a web app
1. Top-right **Deploy → New deployment**.
2. Gear icon → select type **Web app**.
3. **Execute as:** *Me*. **Who has access:** *Anyone*.
   (The shared `SECRET` is what protects it, not Google login — "Anyone" just
   means the request doesn't need a Google account.)
4. **Deploy**, then **Authorize access** and approve the permissions prompt.
5. Copy the **Web app URL** (ends in `/exec`).

> Re-deploying: if you edit the script later, use **Deploy → Manage deployments
> → Edit → Version: New version** so the URL stays the same.

### 3. Point the app at it
Set these env vars (locally in `server/.env`, and in **Vercel → Settings →
Environment Variables** for Production), then redeploy on Vercel:

```
SHEETS_WEBHOOK_URL=<the /exec web app URL>
SHEETS_WEBHOOK_SECRET=<the same SECRET from the script>
```

### 4. Use it
Admin dashboard → **Winners** tab → **Export to Google Sheets**. You'll get
"Exported N winner row(s)…", and the sheet's **Winners** tab will hold the
snapshot. Re-run any time to refresh it.

## Troubleshooting
- **"Google Sheets export is not configured"** → `SHEETS_WEBHOOK_URL` isn't set
  (or you didn't redeploy after adding it on Vercel).
- **502 / "Sheets webhook failed (401)"** → the `SECRET` in the script doesn't
  match `SHEETS_WEBHOOK_SECRET`.
- **502 with a Google login HTML page** → the deployment's "Who has access" is
  not set to *Anyone*; re-deploy with that access level.
