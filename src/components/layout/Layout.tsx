import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowUpRight,
  LayoutDashboard,
  FolderGit2,
  BriefcaseBusiness,
  Award,
  Tags,
  Settings2,
  PanelTop,
  Menu,
  X,
  LogOut,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { getSession, isMock, setSession } from '../../services/api';
import { usePortfolio } from '../../hooks/usePortfolio';
import { Avatar, Loading, ErrorState } from '../ui';
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Ascend home">
      <span className="logo-symbol">
        <span />
      </span>
      ascend<span className="logo-dot">.</span>
    </Link>
  );
}
export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <div className="container nav-inner">
        <Logo />
        <nav className={open ? 'public-links open' : 'public-links'} aria-label="Main navigation">
          <NavLink to="/" end onClick={() => setOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/explore" onClick={() => setOpen(false)}>
            Explore
          </NavLink>
          <NavLink to="/faculty" onClick={() => setOpen(false)}>
            For Faculty
          </NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>
            About
          </NavLink>
        </nav>
        <div className="nav-actions">
          <Link to={getSession() ? '/dashboard' : '/identity'} className="nav-portfolio">
            View My Portfolio
          </Link>
          <Link to="/identity" className="btn primary small">
            Create My Portfolio
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <button
          className="icon-btn mobile-menu"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer container">
      <Logo />
      <p>A little ambition. A place to show it.</p>
      <span>© {new Date().getFullYear()} Ascend</span>
    </footer>
  );
}
const items = [
  ['', 'Dashboard', LayoutDashboard],
  ['portfolio', 'My Portfolio', PanelTop],
  ['projects', 'Projects', FolderGit2],
  ['experience', 'Experience', BriefcaseBusiness],
  ['activities', 'Activities', Award],
  ['skills', 'Skills', Tags],
  ['settings', 'Profile Settings', Settings2],
] as const;
export function DashboardLayout() {
  const { portfolio, loading, error, refresh, setPortfolio } = usePortfolio();
  const [open, setOpen] = useState(false);
  if (!getSession()) return <Navigate to="/identity" replace />;
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={() => void refresh()} />;
  if (!portfolio) return <Navigate to="/identity" replace />;
  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Logo />
        <div className="workspace-label">
          YOUR WORKSPACE
          <button
            className="icon-btn mobile-menu"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav aria-label="Student navigation">
          {items.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={`/dashboard${path ? '/' + path : ''}`}
              end
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-future">
          <GraduationCap size={20} />
          <strong>Built for your journey</strong>
          <p>Your next opportunity starts with what you’ve already done.</p>
          <Link to="/faculty">
            The full platform
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="sidebar-user">
          <Avatar name={portfolio.student.fullName || 'Student'} size="small" />
          <div>
            <strong>{portfolio.student.fullName || 'Your profile'}</strong>
            <small>{portfolio.student.collegeId}</small>
          </div>
          <button
            className="icon-btn"
            title="End editing session"
            onClick={() => {
              setSession(null);
              setPortfolio(null);
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="workspace-header">
          <div>
            <button
              className="icon-btn mobile-menu"
              onClick={() => setOpen(!open)}
              aria-label="Open student navigation"
            >
              <Menu />
            </button>
            <span>Student workspace</span>
            {isMock && <span className="badge demo-label">Demo · stored on this device</span>}
          </div>
          <Link to={`/u/${portfolio.student.collegeId}`} className="text-link">
            View portfolio
            <ArrowUpRight size={15} />
          </Link>
        </header>
        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile student navigation">
        {items.slice(0, 5).map(([path, label, Icon]) => (
          <NavLink key={path} to={`/dashboard${path ? '/' + path : ''}`} end>
            <Icon size={19} />
            <span>{label.replace('My ', '')}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function CreateCTA() {
  return (
    <Link to="/identity" className="btn primary">
      Create My Portfolio
      <ArrowRight size={17} />
    </Link>
  );
}
