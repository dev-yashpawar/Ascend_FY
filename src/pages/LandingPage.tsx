import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Code2,
  FolderGit2,
  Sparkles,
  Share2,
  Palette,
  FileDown,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { PublicNav, Footer, CreateCTA } from '../components/layout/Layout';
import { Avatar, ErrorState, Loading } from '../components/ui';
import { api, isMock } from '../services/api';
import type { Portfolio } from '../types';
import { demoPortfolios } from '../mock/data';
const samples = demoPortfolios();
export function PortfolioCard({
  portfolio: p,
  sample = false,
}: {
  portfolio: Portfolio;
  sample?: boolean;
}) {
  return (
    <Link
      to={sample && !isMock ? '/explore' : `/u/${p.student.collegeId}`}
      className={`sample-card ${p.settings.theme.toLowerCase()}`}
    >
      <div className="sample-preview">
        <div className="mini-top">
          <span>
            {p.student.fullName.split(' ')[0].toLowerCase()}.<b>portfolio</b>
          </span>
          <span>About &nbsp; Projects &nbsp; Contact</span>
        </div>
        <div className="mini-person">
          <Avatar name={p.student.fullName} size="small" />
          <span>
            <strong>{p.student.fullName}</strong>
            <small>{p.student.branch}</small>
          </span>
        </div>
        <h3>
          {p.student.headline.split(' · ').at(-1) || 'A journey in progress'}
          <span>↗</span>
        </h3>
        <div className="mini-chips">
          {p.skills.slice(0, 3).map((s) => (
            <span key={s.skillId}>{s.skillName}</span>
          ))}
        </div>
        <div className="mini-project">
          <Code2 size={18} />
          <span>{p.projects[0]?.title || 'My work & experiences'}</span>
          <ArrowUpRight size={15} />
        </div>
      </div>
      <div className="sample-info">
        <div>
          <strong>{p.student.fullName}</strong>
          <p>
            {p.student.branch} · {p.student.year}
          </p>
        </div>
        <ArrowUpRight size={20} />
      </div>
      <div className="sample-label">
        <span>
          {sample || p.projects.some((project) => project.projectId.startsWith('demo-'))
            ? 'Sample portfolio'
            : isMock
              ? 'Demo portfolio'
              : p.settings.theme + ' theme'}
        </span>
        <span>{p.settings.theme}</span>
      </div>
    </Link>
  );
}
export function LandingPage() {
  const [published, setPublished] = useState<Portfolio[]>([]);
  useEffect(() => {
    api
      .getPublishedPortfolios()
      .then(setPublished)
      .catch(() => {});
  }, []);
  return (
    <>
      <PublicNav />
      <main>
        <section className="landing-hero container">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span /> YOUR JOURNEY. YOUR NEXT CHAPTER.
            </div>
            <h1>
              Your college journey,
              <br />
              <em>professionally</em>
              <br />
              presented<span className="heading-dot">.</span>
            </h1>
            <p>
              Turn your projects, internships, certifications and achievements into a professional
              student portfolio.
            </p>
            <div className="hero-actions">
              <CreateCTA />
              <Link to="/explore" className="btn secondary">
                Explore Portfolios
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="hero-reassurance">
              <span>
                <Check size={14} />
                Free to create
              </span>
              <span>
                <Check size={14} />
                Made for every discipline
              </span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Example of an Ascend student portfolio">
            <div className="visual-orbit" />
            <div className="floating-note top-note">
              <span className="note-icon">
                <FolderGit2 size={18} />
              </span>
              <div>
                <strong>More than a résumé.</strong>
                <small>Proof of what you can do.</small>
              </div>
            </div>
            <div className="hero-portfolio">
              <div className="portfolio-browser">
                <div>
                  <i />
                  <i />
                  <i />
                </div>
                <span>ascend / aarav</span>
                <ArrowUpRight size={13} />
              </div>
              <div className="hero-profile-body">
                <div className="preview-navigation">
                  <span>
                    AD<span>.</span>
                  </span>
                  <small>About &nbsp; Work &nbsp; Contact</small>
                </div>
                <div className="preview-identity">
                  <Avatar name="Aarav Deshmukh" />
                  <span className="availability">
                    <i />
                    Open to opportunities
                  </span>
                </div>
                <p className="preview-hello">Hi, I’m Aarav 👋</p>
                <h2>
                  Turning curiosity
                  <br />
                  into <span>real-world impact.</span>
                </h2>
                <p className="preview-description">
                  IT student. Full stack developer.
                  <br />
                  Always building something that matters.
                </p>
                <div className="preview-skills">
                  <span>React</span>
                  <span>TypeScript</span>
                  <span>Node.js</span>
                </div>
                <div className="preview-divider" />
                <div className="preview-work-head">
                  <strong>Selected work</strong>
                  <ArrowUpRight size={16} />
                </div>
                <div className="hero-project">
                  <div className="project-art">
                    <div className="art-icon">
                      <Code2 size={24} />
                    </div>
                    <div className="art-lines">
                      <i />
                      <i />
                      <i />
                    </div>
                    <span>
                      campus
                      <br />
                      <strong>connect.</strong>
                    </span>
                  </div>
                  <div>
                    <strong>Campus Connect</strong>
                    <p>Bringing the campus closer.</p>
                    <span className="tiny-tag">React</span>
                    <span className="tiny-tag">Node.js</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-note bottom-note">
              <span className="note-icon green">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <strong>A portfolio that’s yours.</strong>
                <small>Build it. Make it you. Share it.</small>
              </div>
              <Sparkles size={16} />
            </div>
            <span className="visual-caption">AARAV’S STORY, AT A GLANCE</span>
          </div>
        </section>
        <div className="proof-band">
          <div className="container proof-inner">
            <span>
              Big ambitions.
              <br />
              <strong>One place to show them.</strong>
            </span>
            <div>
              <FolderGit2 size={22} />
              <span>Your projects</span>
            </div>
            <div>
              <BriefcaseIcon />
              <span>Your experiences</span>
            </div>
            <div>
              <GraduationCap size={24} />
              <span>Your achievements</span>
            </div>
            <div>
              <ArrowUpRight size={23} />
              <span>Your next opportunity</span>
            </div>
          </div>
        </div>
        <section className="section container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">REAL PEOPLE. DISTINCTIVE STORIES.</span>
              <h2>
                A little inspiration for
                <br />
                your next chapter.
              </h2>
              <p>Different disciplines. Different ambitions. One place to shine.</p>
            </div>
            <Link to="/explore" className="text-link">
              Explore portfolios
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="sample-grid">
            {(published.length ? published : samples).slice(0, 3).map((p) => (
              <PortfolioCard key={p.student.collegeId} portfolio={p} sample={!published.length} />
            ))}
          </div>
        </section>
        <section className="value-section container">
          <div className="value-intro">
            <span className="eyebrow">MORE THAN A LIST OF ACHIEVEMENTS</span>
            <h2>
              You did the work.
              <br />
              Give it a home.
            </h2>
            <p>
              The project you stayed up for. The internship that changed your perspective. The
              things a marksheet can’t tell.
            </p>
            <CreateCTA />
          </div>
          <div className="value-grid">
            {[
              [
                FolderGit2,
                'Bring your story together',
                'Projects, experience and achievements, thoughtfully organized.',
              ],
              [
                Palette,
                'Make it feel like you',
                'Three themes, your colors, and the sections that tell your story.',
              ],
              [
                Share2,
                'Ready for your next opportunity',
                'One link and a QR code for applications, recruiters and connections.',
              ],
              [
                FileDown,
                'Take your profile with you',
                'A clean, downloadable profile, ready to print or save as a PDF.',
              ],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof Palette;
              return (
                <article key={String(title)}>
                  <span className="feature-icon">
                    <I size={21} />
                  </span>
                  <h3>{String(title)}</h3>
                  <p>{String(body)}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="institution-section container">
          <div className="institution-mark">
            <ShieldCheck size={35} />
          </div>
          <div>
            <span className="eyebrow">BUILT ON TRUST</span>
            <h2>Your work. Clear provenance.</h2>
            <p>
              Student-entered records stay self reported. An Institution Verified badge appears only
              after a record is verified by your college. Faculty tools are coming in the full
              platform.
            </p>
          </div>
          <Link to="/faculty" className="text-link">
            For institutions
            <ArrowUpRight size={17} />
          </Link>
        </section>
        <section className="mobile-feature container">
          <div>
            <span className="eyebrow">GREAT ON EVERY SCREEN</span>
            <h2>
              Your next opportunity
              <br />
              doesn’t wait for a desktop.
            </h2>
            <p>
              Create on your phone. Share on the move.
              <br />
              Your portfolio fits wherever your journey takes you.
            </p>
            <Link to="/explore" className="text-link">
              Find your inspiration
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="phone-preview">
            <div className="phone-top" />
            <Avatar name="Ananya Patil" />
            <span className="eyebrow">DESIGNER & PROBLEM SOLVER</span>
            <h3>
              Ananya Patil<span>.</span>
            </h3>
            <p>
              Making everyday
              <br />
              things better.
            </p>
            <div className="phone-chips">
              <span>Figma</span>
              <span>Research</span>
            </div>
            <div className="phone-project">
              <Palette size={27} />
              <strong>Wayfinder</strong>
              <small>A better way around campus.</small>
            </div>
            <span className="phone-footer">
              <Smartphone size={12} /> Made to move with you
            </span>
          </div>
        </section>
        <section className="closing-cta container">
          <span className="eyebrow">YOUR STORY IS ALREADY IN THE MAKING</span>
          <h2>Let’s give it a place to grow.</h2>
          <p>A few small steps. A portfolio full of possibilities.</p>
          <CreateCTA />
          <span className="closing-detail">No code. No design experience. Just you.</span>
        </section>
      </main>
      <Footer />
    </>
  );
}
function BriefcaseIcon() {
  return (
    <span className="briefcase-drawing">
      <Code2 size={23} />
    </span>
  );
}
export function ExplorePage() {
  const [data, setData] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const load = () => {
    setLoading(true);
    setError('');
    api
      .getPublishedPortfolios()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const filtered = data.filter((p) =>
    `${p.student.fullName} ${p.student.branch} ${p.skills.map((s) => s.skillName).join(' ')}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PublicNav />
      <main className="container section explore-page">
        <span className="eyebrow">THE ASCEND COMMUNITY</span>
        <h1>
          Ambition looks different
          <br />
          on everyone.
        </h1>
        <p>Discover the projects, people, and possibilities around you.</p>
        {isMock && (
          <div className="demo-notice">
            You’re exploring sample profiles and portfolios published on this device.
          </div>
        )}
        <label className="search-label">
          Find a student or skill
          <input
            type="search"
            placeholder="Search by name, discipline, or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={load} />
        ) : filtered.length ? (
          <div className="sample-grid">
            {filtered.map((p) => (
              <PortfolioCard key={p.student.collegeId} portfolio={p} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No portfolios found yet.</h3>
            <p>Try another search, or be the first to share your story.</p>
            <CreateCTA />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
export function InfoPage({ faculty = false }: { faculty?: boolean }) {
  return (
    <>
      <PublicNav />
      <main className="container section info-page">
        <span className="eyebrow">{faculty ? 'THE FULL PLATFORM · PREVIEW' : 'WHY ASCEND'}</span>
        <h1>
          {faculty
            ? 'Student stories.\nInstitutional possibilities.'
            : 'Every college journey\ndeserves to be seen.'}
        </h1>
        <p>
          {faculty
            ? 'Ascend connects student-owned portfolios with structured achievement records. This MVP focuses on portfolios; institutional workflows are coming in the full platform.'
            : 'A marksheet tells part of your story. Ascend brings the rest together: the things you built, the teams you led, the experiences that shaped you.'}
        </p>
        <div className="info-grid">
          {(faculty
            ? [
                'Faculty verification',
                'NAAC / AICTE / NIRF reports',
                'Institutional analytics',
                'LMS / ERP integrations',
              ]
            : [
                'Student-first portfolios',
                'Every engineering discipline',
                'Clear record provenance',
                'Structured college records',
              ]
          ).map((title, i) => (
            <article className="card" key={title}>
              <span className="feature-icon">
                {faculty ? <ShieldCheck size={22} /> : <GraduationCap size={22} />}
              </span>
              <h3>{title}</h3>
              <p>
                {faculty
                  ? 'Coming in full platform'
                  : [
                      'A beautiful, shareable home for your work.',
                      'Skills and achievements beyond just coding.',
                      'Self reported until institution verification.',
                      'Portfolio fields map to organized Google Sheets records.',
                    ][i]}
              </p>
              {faculty && <span className="badge">Preview only</span>}
            </article>
          ))}
        </div>
        <CreateCTA />
        <Link to="/" className="text-link">
          Back to home
          <ChevronRight size={16} />
        </Link>
      </main>
      <Footer />
    </>
  );
}
