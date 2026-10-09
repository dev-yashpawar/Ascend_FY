# Upload pipeline repair

## Confirmed cause

The original UploadField file input only assigned React File state. Upload required a separate button click. ProfileForm and RecordEditor disabled Save only while an upload was already running, so selecting a file and clicking Save skipped uploadFile entirely. Metadata reached Sheets while the file never reached Drive. No blob URL creation exists in the inspected flow; URL validators already reject blob URLs.

The deployed endpoint successfully accepted an actual generated JPG upload for KBTUG23513. Drive connector readback confirmed the student folder and all six category folders. A project JPG and certificate PDF were also uploaded; saveStudent/addProject/addActivity returned their persisted Drive URLs. This proves the original deployment's upload operation works; it does not prove the new public-proof version is deployed.

## Updated flow

Selecting a valid file automatically starts UploadFile, marks the parent form as pending immediately, converts it to base64, checks backend version/schema readiness, sends the authenticated text/plain POST, and uses the returned persistent URL. Save stays disabled on upload failure until Retry succeeds or the file selection is cleared. Selected metadata and file survive temporary request errors. A stable upload UUID prevents duplicate files on retries. No file bytes/base64 are stored in Sheets.

Public profile/project images use mediaUrl; owner proof links use viewUrl. Proof uploads always begin private. On record save, isPublicProof explicitly applies the corresponding Drive sharing permission. Only files owned by that student's proof folders may be published. Public responses retain proofUrl only when isPublicProof is true. Owner lists show View Certificate or View Proof. Switching public visibility off revokes link access.

## Required backend update

1. Paste the current backend/Code.gs into the Apps Script project's Code.gs.
2. Confirm appsscript.json includes the existing Sheets and Drive scopes from backend/appsscript.json.
3. Run setupAscend. It appends is_public_proof to Activities and Experience, sets existing empty values to false, and preserves all existing data and verification statuses. Re-running it preserves true values.
4. **Deploy > Manage deployments > Edit > Version > New version > Deploy**.
5. Keep the existing /exec URL in .env.local and refresh the website. Saving source alone does not update /exec.
6. The frontend checks getUploadCapabilities for version 2026-10-09.uploads.v2 and schemaReady=true. An outdated deployment displays the exact redeployment instructions instead of pretending the upload succeeded.

## Test through the website

Return with KBTUG23513 / Kbtug23513@kbtcoe.org. A diagnostic session rotated the editing token; sign in again if the previous session expired.

1. Profile Settings: select JPG/PNG. See Uploading..., then Uploaded. Save profile. Confirm Students.photo_url is https, and KBTUG23513/profile contains the actual file. Reload the dashboard/public portfolio and confirm the photo renders, with initials fallback on image errors.
2. Projects: add/edit a project, select a JPG/PNG, wait for Uploaded, then Save project. Confirm Projects.image_url and the projects folder; reload the portfolio.
3. Activities: select Certification, enter title/issuer/date, choose PDF. Wait for Uploaded, leave Show this certificate/proof on my public portfolio unchecked, then Save. Confirm the certificates folder, Activities.proof_url, is_public_proof=false and owner View Certificate button.
4. Edit that certificate, check public visibility and Save. Verify is_public_proof=true, the individual file has Anyone with the link / Viewer, and public View Certificate appears. Uncheck and Save: link sharing becomes Restricted and the public response/button no longer exposes the proof.
5. Open the published /u/KBTUG23513 in an incognito browser. Photos and project images must load; private proof links must be absent. Open a public certificate link and confirm the PDF opens without a Google login.
6. Use a too-large/invalid file and disconnect temporarily to check error/retry and preserved metadata. Save must remain blocked while a selected valid file is pending or failed.

The upload root and category folders stay Restricted. Only individual image files and explicitly public proof files receive public link access. Test records are named Upload pipeline verification and Upload pipeline verification certificate; the PDF is clearly a test file, not a credential.
