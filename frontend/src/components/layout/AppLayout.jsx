import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { initials } from '../../utils/format.js';
import { IconGrid, IconLayers, IconLogout, IconMenu, IconMoon, IconPercent, IconSun, IconUsers } from '../ui/Icons.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconGrid, end: true },
  { to: '/investments', label: 'Investments', icon: IconLayers },
  { to: '/roi', label: 'ROI history', icon: IconPercent },
  { to: '/referrals', label: 'Referrals', icon: IconUsers },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <div className="app">
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <div className="brand-name">Nexachain</div>
            <div className="brand-sub">Investor dashboard</div>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">Referral code: <strong>{user?.referralCode}</strong></div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="btn btn-ghost btn-icon hamburger" aria-label="Open menu" onClick={() => setOpen(true)}>
              <IconMenu />
            </button>
            <h2>{current?.label || 'Dashboard'}</h2>
          </div>
          <div className="topbar-right">
            <button type="button" className="btn btn-ghost btn-icon" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <div className="avatar" aria-hidden>{initials(user?.fullName)}</div>
            <div className="user-meta">
              <div className="name">{user?.fullName}</div>
              <div className="small muted">{user?.email}</div>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={logout} aria-label="Log out" title="Log out">
              <IconLogout />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
