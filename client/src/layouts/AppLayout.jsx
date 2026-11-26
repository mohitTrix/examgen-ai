import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FilePlus2, History, LayoutDashboard, LogOut, Menu, Moon, Settings, Sun, UploadCloud, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Logo } from '../components/ui.jsx';

const links = [
  ['/dashboard', 'Dashboard', LayoutDashboard], ['/create', 'Create exam', FilePlus2], ['/materials', 'Study material', UploadCloud],
  ['/history', 'Exam history', History], ['/profile', 'Profile', User], ['/settings', 'Settings', Settings],
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { dark, setTheme } = useTheme();
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen lg:pl-60">
      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <Logo to="/dashboard" />
        <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
      </header>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`no-print fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-zinc-200 bg-white p-4 transition-transform lg:visible lg:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900 ${open ? 'translate-x-0' : 'invisible -translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <Logo to="/dashboard" />
          <button className="cursor-pointer lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="mt-8 flex-1 space-y-1">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-zinc-100 dark:bg-zinc-800' : 'muted hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-secondary mb-2" onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={16} /> : <Moon size={16} />}{dark ? 'Light mode' : 'Dark mode'}</button>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="min-w-0 text-sm"><p className="truncate font-medium">{user.name}</p><p className="muted truncate text-xs">{user.email}</p></div>
          <button className="btn btn-secondary btn-sm" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={15} /></button>
        </div>
      </aside>
      <main className="mx-auto max-w-5xl p-4 sm:p-8"><Outlet /></main>
    </div>
  );
}
