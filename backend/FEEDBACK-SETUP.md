# Student feedback

Students can submit suggestions, bug reports, and general feedback from **Feedback** in the workspace, the workspace header on mobile, or **Feedback & suggestions** in the website footer (`/feedback`). Sign-in is required to submit; no extra email field is collected.

## Enable Google Sheets collection

1. Copy the complete updated `backend/Code.gs` into the existing Apps Script project and save.
2. Select and run **setupAscend**. Feedback now lives in the separate **Ascend Feedback** spreadsheet in the **Ascend MVP** folder: https://docs.google.com/spreadsheets/d/1e4uQk1vn4n_FFwvnqaZjZsDefrWruRNDYiSFgKXQ1E0/edit. Its ID is configured in the server-only `FEEDBACK_SPREADSHEET_ID` constant; a Script Property of the same name can override it. Do not change the student `SPREADSHEET_ID`.
   Setup copies any missing historical feedback from the old student spreadsheet's Feedback tab by submission ID. It preserves the original tab and destination status edits, and can be rerun without duplicates. Run it again **after deployment** to catch submissions received by the old version during the switch. The Apps Script deployment owner must have edit access to both spreadsheets; setup reports permission problems before testing submissions.
3. **Deploy → Manage deployments → Edit → Version → New version → Deploy.** Saving the source alone does not update the live `/exec` endpoint.
4. Keep the same `VITE_ASCEND_API_URL`. Redeploy the frontend on Vercel after pushing the changes.

The Feedback tab inside **Ascend Feedback** contains:

| Column | Meaning |
| --- | --- |
| feedback_id | Unique submission ID, reused on retries |
| college_id | Signed-in student's college ID |
| category | Suggestion, Bug report, or General feedback |
| subject | Optional subject, up to 120 characters |
| message | Required feedback, 10–2,000 characters |
| created_at | Server timestamp |
| status | Defaults to `new`; staff can update this manually in Sheets |

Feedback is not included in owner or public portfolio responses, and there is no student API to list feedback. Keep the spreadsheet restricted to the authorized Ascend team. Login email and portfolio files are not copied into feedback rows.

API: `GET ?action=getFeedbackCapabilities` checks schema readiness. `POST submitFeedback` takes `{ collegeId, token, feedback: { feedbackId, category, subject, message } }` and returns `{ success: true, data: { feedbackId, createdAt } }` after saving. Student identity comes from the authenticated request, not an ID inside the nested feedback body. Inputs are validated and spreadsheet formula characters are escaped by the shared storage layer.

Writes use the existing Apps Script lock. Same ID and content returns the original receipt without creating another row. Different content or owner with the same ID is rejected. Students can submit at most ten messages in a rolling 24-hour period; retries of completed submissions still work after that limit.

## Test

1. Sign in, open Feedback, select a type, enter an optional subject and a message, then send.
2. Confirm the thank-you screen and one row in Feedback with status `new`.
3. On a temporary network error, the message remains in the form. Retry the same message; it must not create a duplicate row.
4. Open the public portfolio. It must not display student feedback.
5. Test on a phone using the workspace header link. The form should stay in one column with a full-width submit button.

Development mock mode uses a separate localStorage feedback collection; it never writes Google Sheets. The UI labels this mode clearly. If the deployed backend is old or setup has not run, the form keeps the message and explains that feedback is not connected yet.
