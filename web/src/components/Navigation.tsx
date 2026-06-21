import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, LibraryBig, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { showSuccess, showError } = useToastHelpers();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Logged out', 'You have been successfully logged out.', 3000);
      navigate('/login');
    } catch (error) {
      showError('Logout failed', error instanceof Error ? error.message : 'Failed to log out');
    }
  };

  if (!user || ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  const initials = user.email ? user.email.slice(0, 2).toUpperCase() : 'U';

  const NavLink = ({
    to,
    icon: Icon,
    children,
    onClick,
  }: {
    to: string;
    icon: LucideIcon;
    children: React.ReactNode;
    onClick?: () => void;
  }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`nav-link ${active ? 'nav-link-active' : ''}`}
      >
        <Icon size={14} className="shrink-0" />
        {children}
      </Link>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 px-4 py-3">
        <div className="max-w-full mx-auto bg-brand-500 rounded-lg px-4 md:px-5 py-2.5 flex items-center justify-between shadow-md">
          {/* Left: Logo and Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              className="text-white p-1 rounded hover:bg-white/20 transition-colors md:hidden"
              onClick={() => setIsDrawerOpen(true)}
            >
              <span className="text-xl">☰</span>
            </button>
            <Link to="/dashboard" className="no-underline flex items-center gap-2 hover:opacity-90 transition-opacity">
              <GraduationCap size={18} className="text-white shrink-0" />
              <span className="text-white font-bold text-sm md:text-base">Scholarship Manage</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/20 text-white/80">
                v{import.meta.env.VITE_APP_VERSION}
              </span>
            </Link>
          </div>

          {/* Center: Nav Links (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/collaborators" icon={UsersRound}>Collaborators</NavLink>
            <NavLink to="/resources" icon={LibraryBig}>Resources</NavLink>
            <NavLink to="/profile" icon={UserRound}>Profile</NavLink>
          </div>

          {/* Right: User Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold">
                {initials}
              </div>
            </button>
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}
                  >
                    Edit Profile
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                    onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed top-0 left-0 h-full w-64 bg-brand-500 z-50 shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/20">
              <span className="text-white font-bold text-lg">Menu</span>
              <button
                className="text-white hover:opacity-80"
                onClick={() => setIsDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 p-4 mt-2">
              <NavLink to="/dashboard" icon={LayoutDashboard} onClick={() => setIsDrawerOpen(false)}>Dashboard</NavLink>
              <NavLink to="/collaborators" icon={UsersRound} onClick={() => setIsDrawerOpen(false)}>Collaborators</NavLink>
              <NavLink to="/resources" icon={LibraryBig} onClick={() => setIsDrawerOpen(false)}>Resources</NavLink>
              <NavLink to="/profile" icon={UserRound} onClick={() => setIsDrawerOpen(false)}>Profile</NavLink>
              <hr className="border-white/30 my-2" />
              <button
                className="nav-link text-left"
                onClick={() => { navigate('/profile'); setIsDrawerOpen(false); }}
              >
                Edit Profile
              </button>
              <button
                className="nav-link text-left text-red-300"
                onClick={() => { handleLogout(); setIsDrawerOpen(false); }}
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
