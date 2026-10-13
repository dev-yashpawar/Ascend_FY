import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { PortfolioProvider } from './hooks/usePortfolio';
import { LandingPage, ExplorePage, InfoPage } from './pages/LandingPage';
import { StudentIdentityPage } from './pages/StudentIdentityPage';
import { OnboardingPage, ReadyPage } from './pages/OnboardingPage';
import { DashboardPage, RecordsPage, SkillsPage, ProfileSettingsPage } from './pages/DashboardPage';
import { PortfolioBuilderPage } from './pages/PortfolioBuilderPage';
import { PublicPortfolioPage } from './pages/PublicPortfolioPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { EducationPage } from './pages/EducationPage';
import { DashboardLayout } from './components/layout/Layout';
import './styles.css';
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function App() {
  return (
    <BrowserRouter>
      <PortfolioProvider>
        <ScrollReset />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/faculty" element={<InfoPage faculty />} />
          <Route path="/about" element={<InfoPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/identity" element={<StudentIdentityPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/ready" element={<ReadyPage />} />
          <Route path="/u/:collegeId" element={<PublicPortfolioPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="portfolio" element={<PortfolioBuilderPage />} />
            <Route path="projects" element={<RecordsPage kind="project" />} />
            <Route path="experience" element={<RecordsPage kind="experience" />} />
            <Route path="activities" element={<RecordsPage kind="activity" />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="education" element={<EducationPage />} />
            <Route path="settings" element={<ProfileSettingsPage />} />
            <Route path="feedback" element={<FeedbackPage workspace />} />
          </Route>
          <Route
            path="*"
            element={
              <main className="empty-state public-empty">
                <h1>This page took a different path.</h1>
                <p>Let’s get you back to your journey.</p>
                <Link className="btn primary" to="/">
                  Back to home
                </Link>
              </main>
            }
          />
        </Routes>
      </PortfolioProvider>
    </BrowserRouter>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
