'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useMemo } from 'react';

type NavItem = { href: string; label: string; exact?: boolean };
const baseNavItems: NavItem[] = [
  { href: '/dashboard', label: '📊 Dashboard', exact: true },
  { href: '/dashboard/properties', label: '🏠 Properties' },
  { href: '/dashboard/inspections', label: '📋 Inspections' },
  { href: '/dashboard/issues', label: '⚠️ Issues' },
  { href: '/dashboard/routes', label: '🚗 Routes' },
];
const checklistsNavItem: NavItem = { href: '/dashboard/checklists', label: '📝 Checklists' };
const usersNavItem: NavItem = { href: '/dashboard/users', label: '👤 Users' };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = () => setMobileMenuOpen(false);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const navItems = useMemo(
    () => (isAdmin ? [...baseNavItems, checklistsNavItem, usersNavItem] : baseNavItems),
    [isAdmin]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-emerald-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 min-h-[44px]">
            <div className="flex items-center gap-4 md:gap-8">
              <Link href="/dashboard" className="text-lg md:text-xl font-bold shrink-0">
                🏠 Nest Home
              </Link>
              {/* Desktop nav */}
              <div className="hidden md:flex gap-1">
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center ${
                        isActive
                          ? 'bg-emerald-700 text-white'
                          : 'text-emerald-100 hover:bg-emerald-700/50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm text-emerald-200 hover:text-white transition-colors py-2 px-3 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center md:min-w-0"
                aria-label="Sign out"
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden" aria-hidden>⎋</span>
              </button>
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="md:hidden p-2 rounded-lg text-emerald-100 hover:bg-emerald-700/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <span className="text-xl" aria-hidden>✕</span>
                ) : (
                  <span className="text-xl" aria-hidden>☰</span>
                )}
              </button>
            </div>
          </div>
          {/* Mobile nav dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-emerald-700/50">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                        isActive
                          ? 'bg-emerald-700 text-white'
                          : 'text-emerald-100 hover:bg-emerald-700/50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
