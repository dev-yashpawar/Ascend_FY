import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PortfolioView } from '../../src/components/portfolio/PortfolioView';
import { completePortfolio } from './portfolio';
import { emptyPortfolio } from '../../src/types';
import '../../src/styles.css';
function DesignPreview() {
  const [p, setP] = useState(completePortfolio());
  return (
    <>
      <div
        style={{
          padding: 12,
          background: '#e8edf4',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          fontSize: 12,
        }}
        aria-label="Isolated design fixture"
      >
        <span>FICTIONAL TEST PROFILE</span>
        {(['Modern', 'Minimal', 'Developer'] as const).map((theme) => (
          <button
            key={theme}
            onClick={() => setP((v) => ({ ...v, settings: { ...v.settings, theme } }))}
          >
            {theme}
          </button>
        ))}
        <button
          onClick={() =>
            setP((v) => ({
              ...v,
              settings: {
                ...v.settings,
                font: v.settings.font === 'Inter' ? 'DM Sans' : 'Inter',
                accent: '#16786b',
              },
            }))
          }
        >
          Change font and accent
        </button>
        <button
          onClick={() =>
            setP({
              ...emptyPortfolio('KBTUG23997', 'hidden@kbtcoe.org'),
              student: {
                ...emptyPortfolio('KBTUG23997', '').student,
                fullName: 'Jordan Lee',
                headline: 'Mechanical Engineering Student',
              },
              settings: { ...emptyPortfolio('KBTUG23997', '').settings, published: true },
            })
          }
        >
          Sparse profile
        </button>
        <button onClick={() => setP(completePortfolio())}>Complete profile</button>
        <button onClick={() => setP(v => ({ ...v, student: { ...v.student, photoUrl: 'http://127.0.0.1:5174/tests/fixtures/missing-photo.jpg' }, projects: v.projects.map(project => ({ ...project, imageUrl: 'http://127.0.0.1:5174/tests/fixtures/missing-project.jpg' })) }))}>Test image fallback</button>
        <button
          onClick={() =>
            setP((v) => ({ ...v, links: { ...v.links, showEmail: !v.links.showEmail } }))
          }
        >
          Toggle email privacy
        </button>
      </div>
      <PortfolioView portfolio={p} />
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <DesignPreview />
  </BrowserRouter>,
);
