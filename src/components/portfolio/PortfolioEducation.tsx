import type { EducationRecord, Student } from '../../types';
import { educationLabel, educationScore } from '../../utils/education';
import { collegeName } from '../../utils/profile';
export function PortfolioEducation({
  records,
  student,
}: {
  records: EducationRecord[];
  student: Student;
}) {
  const publicRecords = records.filter((r) => r.showPublic === true);
  return (
    <div className="pp-education">
      {student.branch && (
        <div>
          <span className="pp-overline">ACADEMIC FOUNDATION</span>
          <h3>{student.branch}</h3>
          <p>{collegeName}</p>
          {student.year && <span className="pp-tag">{student.year}</span>}
        </div>
      )}
      {!!publicRecords.length && (
        <div className="pp-education-results">
          {publicRecords.map((r) => (
            <article key={r.educationId}>
              <span className="pp-overline">{educationLabel(r)}</span>
              <h3>{r.institution}</h3>
              <p>{[r.board, r.academicYear].filter(Boolean).join(' · ')}</p>
              {r.score !== '' && <strong>{educationScore(r)}</strong>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
