# Student identity update

Students can now use `STKBTCOE` followed by digits and any valid personal or college email address. IDs are case-insensitive and stored uppercase; emails are trimmed and stored lowercase. Returning students must use their original registered email. Existing KBTUG records, public URLs, Drive folders, and spreadsheet rows are not renamed or deleted.

The existing `college_email` sheet column and `collegeEmail` API field store the private login email, including personal emails. Keeping these names avoids a destructive schema migration. Public contact fields remain separate and opt-in; login email is never a public contact fallback. This remains the existing MVP identity-matching flow, not email ownership verification.

## Apply the backend update

1. Replace Apps Script `Code.gs` with the complete current `backend/Code.gs` and save.
2. **Deploy → Manage deployments → Edit → Version → New version → Deploy.** Saving source alone does not update `/exec`.
3. For the default college, remove `COLLEGE_ID_PATTERN` or use `^(?:STKBTCOE[0-9]+|KBTUG[0-9]{5})$`. The two previous KBTUG-only defaults are upgraded automatically; other custom patterns are still respected.
4. Remove the obsolete `COLLEGE_EMAIL_DOMAIN` property if present. The code ignores it for login.

No sheet migration or `setupAscend` run is required for this identity change. Keep the same deployment URL.

## Apply the frontend update

`.env.local` has been updated. Restart `npm run dev`. In Vercel, set `VITE_COLLEGE_ID_PATTERN` to the same combined pattern (or remove it to use the default), remove the unused `VITE_COLLEGE_EMAIL_DOMAIN`, then redeploy the frontend.

## Test

- Create a new student using their actual `STKBTCOE` ID and personal email; onboarding should open.
- Return with the same ID/email in any letter case; Welcome back should appear.
- A new student with a college email should work identically.
- A different email for an existing ID must be rejected. Changing someone's registered email requires a separate owner-verified recovery flow; this update does not let arbitrary emails replace it.
- IDs with no numeric suffix or letters in the suffix, and malformed emails, must be rejected.
- Published portfolios must continue to hide the login email.
