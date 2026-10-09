import { useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { usePortfolio } from '../../hooks/usePortfolio';
import { Feedback } from '../ui';
import type { Skill } from '../../types';
export function SkillsForm({
  onSaved,
  label = 'Save skills',
}: {
  onSaved?: () => void;
  label?: string;
}) {
  const { portfolio, setPortfolio } = usePortfolio();
  const [skills, setSkills] = useState<Skill[]>(portfolio!.skills);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  function add(value: string) {
    const name = value.trim().slice(0, 60);
    if (!name) return;
    if (skills.some((s) => s.skillName.toLowerCase() === name.toLowerCase())) {
      setError('That skill is already on your list.');
      return;
    }
    setSkills((p) => [
      ...p,
      {
        skillId: crypto.randomUUID(),
        collegeId: portfolio!.student.collegeId,
        skillName: name,
        sortOrder: p.length,
      },
    ]);
    setInput('');
    setError('');
    setSuccess('');
  }
  function move(index: number, delta: number) {
    setSkills((p) => {
      const arr = [...p];
      [arr[index], arr[index + delta]] = [arr[index + delta], arr[index]];
      return arr;
    });
    setSuccess('');
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setPortfolio(
        await api.saveSkills(
          portfolio!.student.collegeId,
          skills.map((s, i) => ({ ...s, sortOrder: i })),
        ),
      );
      setSuccess('Skills saved.');
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="editor-form">
      <p className="form-description">
        Technical skills, creative skills, people skills. There’s room for all of them.
      </p>
      <div className="field">
        <label htmlFor="skill-input">Add a skill</label>
        <div className="input-with-button">
          <input
            id="skill-input"
            placeholder="Type a skill and press Enter"
            maxLength={60}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(input);
              }
            }}
          />
          <button type="button" className="btn secondary" onClick={() => add(input)}>
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>
      <div className="editable-skills">
        {skills.map((s, i) => (
          <div className="editable-chip" key={s.skillId}>
            <span>{s.skillName}</span>
            <button
              className="icon-btn"
              aria-label={`Move ${s.skillName} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <ArrowUp size={13} />
            </button>
            <button
              className="icon-btn"
              aria-label={`Move ${s.skillName} down`}
              disabled={i === skills.length - 1}
              onClick={() => move(i, 1)}
            >
              <ArrowDown size={13} />
            </button>
            <button
              className="icon-btn"
              aria-label={`Remove ${s.skillName}`}
              onClick={() => {
                setSkills((p) => p.filter((x) => x.skillId !== s.skillId));
                setSuccess('');
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <span className="eyebrow">A FEW IDEAS TO GET YOU STARTED</span>
      <div className="suggested-skills">
        {[
          'React',
          'Java',
          'Python',
          'Node.js',
          'MongoDB',
          'Docker',
          'Figma',
          'AutoCAD',
          'SolidWorks',
          'Communication',
          'Leadership',
          'Problem Solving',
        ]
          .filter((n) => !skills.some((s) => s.skillName === n))
          .map((n) => (
            <button key={n} className="suggestion" onClick={() => add(n)}>
              <Plus size={12} />
              {n}
            </button>
          ))}
      </div>
      <Feedback error={error} success={success} />
      <button className="btn primary" disabled={busy} onClick={() => void save()}>
        {busy && <Loader2 size={16} className="spin" />}
        {busy ? 'Saving…' : label}
      </button>
    </div>
  );
}
