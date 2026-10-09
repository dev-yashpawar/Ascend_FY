# Public portfolio contact upgrade

The portfolio redesign includes optional public contact fields. College login email remains private. Upload handling, verification, and publishing are unchanged.

## Update the existing Apps Script deployment

1. Copy the complete current `backend/Code.gs` into your existing Apps Script project's `Code.gs`.
2. Save, select `setupAscend`, and run it.
3. Confirm the **Links** sheet has the original six columns followed by `public_email`, `phone`, `show_email`, `show_phone`.
4. **Deploy → Manage deployments → Edit → Version → New version → Deploy.** Saving the source does not update `/exec`.
5. Keep the existing deployment URL in `.env.local`. Restart Vite only if the URL changes.

The migration appends columns and preserves existing rows and visibility choices. Legacy records receive empty contact fields and `false` visibility. Do not recreate or clear sheet tabs.

## Test public contact privacy

1. Sign in and open the existing professional links editor.
2. Add a public contact email and optional phone. Leave both visibility boxes unchecked, then save.
3. Open the published `/u/:collegeId` portfolio in a separate browser session. Neither contact value nor college login email should appear.
4. Enable **Show email publicly**, save, and reload the public portfolio. The contact section now includes Email me. Phone remains hidden.
5. Enable phone visibility only if desired. Turn either switch off to remove that value from public API responses and public pages.

The owner response retains private contact values for editing. Public portfolio responses (including owner `publicView` requests and gallery responses) redact values whose switches are off. Frontend rendering also requires a strict boolean `true` and a valid value.

## Themes and proof

Existing saved themes, fonts, accents, section order, and hidden sections are retained. New portfolios default to Modern. The builder uses the same redesigned renderer as public portfolios, with container-based responsive layout so a narrow desktop preview behaves correctly.

Certificate links require both `isPublicProof === true` and a valid `proofUrl`. Private certificate metadata can be shown, but private URLs are omitted from public responses and links. Self-reported records never receive an institution verification badge.

Browser print creates the resume/PDF; navigation, sharing, and action buttons are hidden. Dynamic page title and Open Graph tags are added after the API loads. Reliable previews in social crawlers that do not execute JavaScript will require server-side rendering or a prerendered public route later.
