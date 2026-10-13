# Education records

The student workspace now has **Education** at `/dashboard/education`, available in the desktop sidebar and mobile navigation drawer. Students can add, edit, and delete 10th, 12th, diploma, and Engineering Year 1–4 results. Only one entry per level/year is allowed. Diploma is an overall result, engineering results are year-wise.

Each record stores institution, optional board/university and academic year, grading type, optional result, CGPA scale (4 or 10), and explicit public visibility. Percentage accepts 0–100, CGPA accepts 0–its scale, with up to two decimal places. A blank result means not yet available; zero remains a real result.

## Activate saving

1. Copy the entire updated `backend/Code.gs` into your existing Apps Script project and save.
2. Run **setupAscend**. This appends a new **Education** tab in **Ascend Student Data** without deleting existing data. Feedback remains in its separate spreadsheet.
3. **Deploy → Manage deployments → Edit → Version → New version → Deploy.** Saving source alone does not update `/exec`.
4. Push/redeploy the frontend. Keep the same `VITE_ASCEND_API_URL`.

The frontend checks `getEducationCapabilities` before saving. An old backend shows a setup instruction and keeps the student's draft. Missing Education tables do not break portfolio reads on the updated backend.

Columns: `education_id`, `college_id`, `level`, `institution`, `board`, `academic_year`, `engineering_year`, `grading_type`, `score`, `scale`, `show_public`.

`POST saveEducation` takes `{collegeId, token, education: [...]}` and returns the updated owner portfolio. Record identity and deletion are checked against the logged-in student. The full list is validated before changes; retries upsert the same IDs. Inputs use the shared spreadsheet formula escaping. There is no institutional verification badge for student-entered grades.

Records are private by default. Only `showPublic: true` records are returned by public portfolio/gallery responses or shown in the builder. The existing Education section visibility and order controls still apply. Institution and branch information already on the profile remains visible under the same existing settings.

## Check

1. Add a 10th result of 85.50%, a diploma entry, and Engineering Year 1 with 8.75/10 CGPA.
2. Confirm rows in Education. Refresh and edit an entry; confirm the same ID is updated.
3. Add Year 2 with no score. It should say "Result not added yet" in the workspace.
4. Try an invalid score or duplicate year; the form must show an error.
5. Enable public visibility on only one record and publish the portfolio. Public view must show that record and omit the others. Hiding Education in the builder hides the whole section.
6. Delete one record after confirmation. Other student records must remain intact.
