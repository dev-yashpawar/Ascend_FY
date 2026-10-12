# ASCEND

Centralized Student Activity Record & Digital Portfolio Platform. React + Vite + TypeScript + Tailwind CSS, with Google Apps Script and Google Sheets persistence. Institutional modules are labeled previews; student portfolios are the working vertical slice.

## Run the connected app

```sh
npm install
npm run dev
```

Live API mode is the default. Deploy the Apps Script backend and configure `.env.local` using [backend/SETUP.md](backend/SETUP.md). Until a real `/exec` URL is supplied, student identity/save requests show a connection error and do not create mock records. The landing page retains clearly labeled fictional design samples; institutional modules remain mock. An explicit `VITE_USE_MOCK_DATA=true` is available only for local development/testing and does not support Drive uploads.

## Student journey

1. Create My Portfolio → college ID (`STKBTCOE` followed by digits) and personal or college email.
2. Complete the eight-step wizard. Each successful profile/skills/links step saves; projects, experiences, and activities save individually.
3. Review actual profile strength and customize the portfolio.
4. Choose Minimal, Modern, or Developer; font, accent, visible sections, and order.
5. Publish from My Portfolio. Share `/u/COLLEGE_ID` using copy, native share, or QR. Save as PDF uses the browser print dialog.
6. Return with the same identity to edit, add, or delete records. Unpublish removes public access.

## Connect Google Sheets

Follow [backend/SETUP.md](backend/SETUP.md). Copy `.env.example` to `.env.local`:

```dotenv
VITE_USE_MOCK_DATA=false
VITE_ASCEND_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT/exec
VITE_COLLEGE_ID_PATTERN=^(?:STKBTCOE[0-9]+|KBTUG[0-9]{5})$
VITE_COLLEGE_NAME=KBT College of Engineering
```

Restart Vite after changes. All calls live in `src/services/ascendApi.ts`; `api.ts` is a compatibility facade. Every live save writes structured rows to the corresponding sheet. The browser receives a portfolio aggregate so the UI stays consistent. UUIDs support idempotent retries when a response is lost. Mock data is not automatically uploaded into Sheets.

## Deploy on Vercel

1. Put this directory in your own Git repository and import it into Vercel.
2. Framework: Vite. Build command: `npm run build`. Output: `dist`.
3. Set the five environment variables above. Production builds always use the live API; set `VITE_USE_MOCK_DATA=false` for the pilot.
4. Deploy. `vercel.json` rewrites client routes, including `/u/:collegeId`, to `index.html`.
5. Use the acceptance checklist in the backend setup document to confirm live saves from the deployed origin.

Your existing spreadsheet and upload folder IDs are configured in server code, and the live Apps Script endpoint is configured in `.env.local`. Real diagnostic image/PDF uploads and persistent record URLs have been verified. Local unit tests use isolated service doubles. Clearly labeled live upload verification records are separate from academic credentials.

## Validation

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Unit tests cover identity rules, profile strength, category mapping, and URL safety. Backend tests run the actual `Code.gs` with isolated Google Sheets and Drive test doubles and exercise all schemas, private/public access, CRUD, validation, idempotency, and verification protections. Browser tests cover onboarding → publish → public profile, record editing/deletion, theme persistence, mobile navigation/preview, QR and print visibility, and common viewport widths.

## Architecture

`src/types` defines the shared portfolio model; `src/services/ascendApi.ts` owns Apps Script transport and the explicit development adapter; `src/hooks/usePortfolio.tsx` owns the editable portfolio; reusable form components implement structured data entry; `PortfolioView` renders all three themes from the same data and settings; institutional mock modules live in `InfoPage` and have no analytics or reporting backend.

The UI uses Inter, Poppins, and DM Sans from Google Fonts, with a system sans-serif fallback. Photos are optional Drive uploads or external URLs with initials fallback. Proof files start private; students may explicitly publish individual proofs. Private proof URLs are omitted from public responses. No student email is rendered publicly. Publishing is explicit. Profile strength is completion guidance, not academic assessment.

## MVP identity limitation

The ID/email pair is identity matching, **not authentication** or proof of email ownership. Anyone who knows a student’s ID/email can start an editing session. The backend issues a random bearer edit token, stores only its hash in Script Properties, checks record ownership, and rejects client verification flags. A new session invalidates the previous token. Replace `startSession` and `authorized_` with real institutional authentication before broad institutional rollout. Do not store tokens or spreadsheet IDs in Vite environment variables.

Apps Script locks serialize writes; Sheets is suitable for the MVP but is not a transactional high-volume database. Skills replacement validates the entire payload before writing but cannot roll back Google platform failures mid-write. Retrying preserves UUIDs; retry saves on temporary failures. Quotas, Apps Script access restrictions, and Script Properties capacity bound MVP scale. Public pages are a client-rendered SPA; per-student social metadata and search indexing would require prerendering or SSR later.

## Verification

New records start at `self_reported`. Set `verification_status` manually in Sheets to `pending`, `verified`, or `rejected`. Only `verified` produces the Institution Verified badge. A changed record resets its verification to `self_reported`; an identical retry retains it. No identity badge is claimed because the requested STUDENTS schema has no institution identity-verification field.

## Community Wisdom

- [React Email Checks Need Abortable State](https://dev.to/ryanlee91/react-email-checks-need-abortable-state-36f2): informed submit-time identity checking and explicit timeout/error feedback. The article recommends local validation plus submit-time checking when live validation adds noise; its discussion had no comments.
- [Submit an HTML Form to Google Sheet](https://dev.to/rezzcode/submit-an-html-form-to-google-sheet-2h92): demonstrates the Apps Script form-to-Sheets bridge. This implementation adds structured tables, validation, write locking, edit tokens, privacy rules, and formula protection. Its comments discuss repeatable structured rows; they provide no performance evidence. The tutorial’s suggestion to make a Sheet publicly editable is not used; keep the spreadsheet private.

Official references: [Google Apps Script web apps](https://developers.google.com/apps-script/guides/web), [Content Service and redirects](https://developers.google.com/apps-script/guides/content), [Vite environment variables](https://vite.dev/guide/env-and-mode).

## Google integration update

See [backend/SETUP.md](backend/SETUP.md) for resource-specific deployment and [backend/UPLOAD-DEBUG.md](backend/UPLOAD-DEBUG.md) for the upload repair and test steps. Selecting a valid file uploads it automatically; save after Uploaded ✓ to attach its persistent Drive URL. Owner proof links are available, and public proof links require the student's explicit visibility choice.

[Google Workspace: Apps Script redirect behavior](https://dev.to/googleworkspace/youre-probably-using-curl-wrong-with-your-google-apps-script-web-app-1ed8) informed redirect-following transport. [Google Workspace: Drive blobs and scopes](https://dev.to/googleworkspace/drive-file-get-blob-and-scopes-in-google-apps-script-3ck8) informed the explicit Drive scope. Both discussions had no comments when checked.
