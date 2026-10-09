# Connect Ascend to your existing Google resources

The existing Web App is configured in `.env.local`. Use these steps for initial setup or backend updates. Do not replace the endpoint with a guessed URL.

## 1. Open the Apps Script project

Open [Ascend Student Data](https://docs.google.com/spreadsheets/d/1r-ORdVKmKzzb3Zv4DO0OqwMWFYSgYRItuQElQqG_fRI/edit), then choose **Extensions > Apps Script**. Name the project `Ascend API`.

Replace the contents of `Code.gs` with this workspace's `backend/Code.gs`. The server already contains:

```javascript
const SPREADSHEET_ID = '1r-ORdVKmKzzb3Zv4DO0OqwMWFYSgYRItuQElQqG_fRI';
const UPLOAD_ROOT_FOLDER_ID = '1H2fhrSwv6jcvQb_AB4jKtOYGxxWxjvXJ';
```

No IDs or Google credentials are required in the frontend. An optional `SPREADSHEET_ID` Script Property overrides the constant; remove an old override if it points at a different spreadsheet.

Open **Project Settings**, enable **Show appsscript.json manifest file in editor**, and replace its contents with `backend/appsscript.json`. It includes Sheets and Drive scopes; no advanced service or API key is needed.

Optional Script Properties: `COLLEGE_ID_PATTERN` = `^KBTUG[0-9]{5}$`, `COLLEGE_EMAIL_DOMAIN` = `kbtcoe.org`. Defaults already match your identity example.

## 2. Check privacy and run setup

Keep the spreadsheet, [Ascend MVP parent folder](https://drive.google.com/drive/folders/1Q_xV4_s8nhvPVH5PlGzxjkkJKueTR-c2), and [Student Uploads](https://drive.google.com/drive/folders/1H2fhrSwv6jcvQb_AB4jKtOYGxxWxjvXJ) **Restricted** in Drive. Do not share the entire folder publicly or with the entire domain. Check inherited permissions too. Explicit institution staff access is allowed. Proof files belong to the deploying institution account; the student's ID/email session does not itself grant Drive access.

Select `setupAscend` in the Apps Script function dropdown and click **Run**. Authorize the script to access your spreadsheet and upload folder using the account that owns or can edit both. Review the requested Sheets/Drive scopes.

Setup validates existing headers, creates missing tabs if necessary, and preserves existing records. Exact tab names:

- `Students`
- `Skills`
- `Projects`
- `Experience`
- `Activities`
- `Links` (optional public contact fields and safe migration: see [PUBLIC-CONTACT-SETUP.md](./PUBLIC-CONTACT-SETUP.md))
- `PortfolioSettings`

Setup safely appends `is_public_proof` to existing Activities and Experience tabs, filling missing values with false while preserving rows and existing visibility choices. Unrelated header mismatches stop setup and name the tab; never clear a populated tab to resolve them. The code does not create the old uppercase tabs.

Student folders are created automatically on the first upload:

```text
Student Uploads/
  KBTUG23513/
    profile/
    projects/
    certificates/
    internships/
    achievements/
    other/
```

## 3. Deploy the Web App

1. Click **Deploy > New deployment**.
2. Choose the gear / **Select type > Web app**.
3. Description: `Ascend MVP API`.
4. **Execute as: Me** (the account with access to these resources).
5. **Who has access: Anyone**. This allows the website to fetch published portfolios without a Google login. The spreadsheet and proof folders remain restricted.
6. Click **Deploy**, complete any authorization requested, and copy the **Web app URL ending in `/exec`**. Use `/exec`, not the editor's `/dev` test URL.

If your institution's Workspace policy disallows anonymous Apps Script web apps or public image sharing, ask the institution administrator to enable the required deployment/sharing policy. Private proof uploads do not require public sharing. Do not make the spreadsheet public to fix an API access error.

After backend edits: **Deploy > Manage deployments > Edit > Version: New version > Deploy**. Saving code alone does not update an existing deployment.

Deployment reference: [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web). Responses follow Google's [Content Service redirect](https://developers.google.com/apps-script/guides/content); the frontend uses `redirect: 'follow'` and simple `text/plain` POST bodies.

## 4. Connect the existing frontend

Copy `.env.example` to `.env.local`, then replace ONLY the endpoint placeholder with the URL you just copied:

```dotenv
VITE_USE_MOCK_DATA=false
VITE_ASCEND_API_URL=PASTE_APPS_SCRIPT_WEB_APP_URL_HERE
VITE_COLLEGE_ID_PATTERN=^KBTUG[0-9]{5}$
VITE_COLLEGE_EMAIL_DOMAIN=kbtcoe.org
VITE_COLLEGE_NAME=KBT College of Engineering
```

Restart `npm run dev`. The shipped default is live API mode. Missing/placeholder URLs show an actionable connection error; failed requests never fall back to mock student data. `VITE_USE_MOCK_DATA=true` is an explicit local development/test adapter only; never use it for the student pilot. Drive uploads are intentionally unavailable in that test adapter.

In Vercel set the same environment variables, select Vite, build with `npm run build`, output `dist`, and redeploy after environment changes. `vercel.json` handles deep links such as `/u/KBTUG23513`. No Google credentials, spreadsheet IDs or Drive folder IDs go in `VITE_` variables.

## 5. API contract

All responses are `{ success: true, data: ... }` or `{ success: false, message: 'Readable error' }`.

GET query actions:

- `getStudent&collegeId=KBTUG23513` returns `{ exists: boolean }` without leaking an email.
- `getPortfolio&collegeId=KBTUG23513` returns a published portfolio. An owner edit token permits private draft reads. `publicOnly=true` always redacts email and private proof URLs, including an owner reading their public page. Explicitly public proofs retain their URLs.
- `getUploadCapabilities` returns the upload version and schema readiness. The frontend requires version `2026-10-09.uploads.v2` and `schemaReady=true`.
- `getPublishedPortfolios` returns published, redacted portfolio aggregates.

POST JSON (sent with `Content-Type: text/plain;charset=utf-8`):

- `startSession`: `{ collegeId, collegeEmail }` creates one Students row when missing, returns `{ exists, session: { collegeId, token }, portfolio }`.
- `saveStudent`: `{ collegeId, token, student }` updates the same row. ID and email are immutable.
- `saveSkills`: `{ collegeId, token, skills }` replaces the student's ordered skills.
- `addProject`, `updateProject`, `addExperience`, `updateExperience`, `addActivity`, `updateActivity`: `{ collegeId, token, record }`.
- `deleteProject`, `deleteExperience`, `deleteActivity`: `{ collegeId, token, recordId }`.
- `saveLinks`: `{ collegeId, token, links }` upserts one row.
- `saveSettings`: `{ collegeId, token, settings }` upserts one row.
- `uploadFile`: `{ collegeId, token, category, fileName, mimeType, base64, uploadId }` returns `{ fileId, viewUrl, fileName, mimeType, public, mediaUrl }`.

Fields use the existing camelCase TypeScript model. Sheet columns use snake_case. Arrays are JSON strings in Sheets. Portfolio data uses `experiences`; the frontend read adapter also accepts `experience`. Themes use `Minimal`, `Modern`, `Developer` to preserve the existing UI. Section names match the UI. IDs use UUIDs generated by the backend when absent; stable client UUIDs allow idempotent retries.

## Upload behavior and privacy

Choose a valid file to start uploading automatically. Wait for **Uploaded ✓**, then save the existing profile/project/activity/experience form. Save is disabled while a selected upload is pending or failed; Retry or remove the selection to recover. A successful upload alone creates a Drive file; saving attaches its persistent URL to the appropriate Sheet row. Cancelling a form may leave an unattached file in Drive; files are never silently deleted from Drive when records are removed.

Both browser and server enforce JPG/JPEG/PNG up to 4 MiB and PDF up to 5 MiB. The server also checks decoded bytes, file signatures, MIME/extension matching, category, ownership and session. Base64 is transient request data and is never stored in Sheets or Script Properties. Repeating the same upload ID/name/category reuses a completed Drive file.

- Profile photos and project images are public link-viewable media. Their public thumbnail URL is stored in `photo_url` / `image_url`.
- Experience proof goes to `internships`.
- Certification proof goes to `certificates`.
- Academic Achievement, Competition and Hackathon proof goes to `achievements`.
- Other activity proof goes to `other`.
- Proofs start Restricted. Owners can open View Certificate / View Proof from their record list. Checking **Show this certificate/proof on my public portfolio** and saving makes only that proof file viewable by link; public API responses and portfolio cards then include its link. Unchecking and saving revokes public link access. The root folder stays Restricted.

The private upload hierarchy is checked before each upload. Public sharing errors are shown and may be retried after fixing account policy. Drive's public thumbnail endpoint is used for image embedding; verify it from an incognito browser in your account. Drive is adequate for this pilot, but image hosting can be replaced later without changing the record schema.

## Live acceptance checklist (do this after deployment)

Use **KBTUG23513 / Kbtug23513@kbtcoe.org** only when testing your own identity. If a row already exists, continue editing it instead of deleting it. No test records have been inserted into your live resources by this implementation.

1. Create My Portfolio: confirm exactly one Students row and normalized ID/email. Repeat identity entry: Welcome back.
2. Save profile twice. Confirm the same row updates, with created_at preserved and updated_at advanced.
3. Add React, Node.js and Java skills, reorder and remove one. Confirm one row per remaining skill with sort_order.
4. Add a project, upload a PNG/JPG and save it. Confirm Projects row, JSON tech_stack and public image URL; verify Drive path `KBTUG23513/projects`.
5. Add Certification activity, upload a PDF and save. Confirm Activities row with proof_url and `KBTUG23513/certificates` file. Open its link in incognito: it must require authorized Google access.
6. Add/edit/delete experience; upload internship proof. Confirm month dates, currently_working and internships folder.
7. Save optional links twice and customize themes/font/accent/section order. Confirm only one Links and PortfolioSettings row each.
8. Publish, copy `/u/KBTUG23513`, and open it on another browser/device with no editing session. Confirm real Sheets data, theme and no private proof URLs in the public JSON response. Verify self_reported records have no Institution Verified badge.
9. Change verification_status to verified manually in a single record row and reload. Only that record shows Institution Verified. Edit it: status returns to self_reported.
10. Verify desktop and narrow mobile form layouts, QR, native share/copy fallback and browser print/PDF.
11. Temporarily go offline, edit a record and save. Confirm an error, preserved draft and enabled retry. Reconnect and retry: one record/file, no duplicate.
12. Unpublish; confirm public access fails without an editing session.

## MVP boundaries

ID/email matching is **not production authentication**. A person who knows the pair can obtain an edit token. Tokens are hashed in server properties, checked for every write/upload, and rotated on return. Use only for the authorized small pilot; replace `startSession` / `authorized_` with verified institutional login before broader rollout.

Sheets writes are serialized by a script lock. They are not database transactions: a Google service failure during a multi-row skills replacement can leave a partial save, recoverable by retry. Drive files may remain unattached after an interrupted form. Staff can audit/remove unused files in Drive. Institutional analytics/reports/faculty/ERP/LMS are still mock UI.
