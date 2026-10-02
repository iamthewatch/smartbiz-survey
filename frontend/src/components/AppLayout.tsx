import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardList, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/utils'
import { AnimatedBackground, Logo } from './ui'

const NAV = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { to: '/surveys', label: 'Анкеты', icon: ClipboardList },
  { to: '/leads', label: 'Лиды', icon: Users },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, end }, i) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}>
          {({ isActive }) => (
            <span
              className={cn(
                'relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'text-milk' : 'text-stone-600 hover:bg-graphite/[0.05] hover:text-graphite',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full bg-graphite"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className={cn('relative h-[18px] w-[18px]', isActive && 'text-rust-400')} />
              <span className="relative flex-1">{label}</span>
              <span className={cn('relative font-mono text-[10px]', isActive ? 'text-stone-400' : 'text-stone-400/70')}>/ 0{i + 1}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function UserCard() {
  const { user, logout } = useAuth()
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-graphite/10 bg-paper p-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-graphite text-sm font-bold text-milk">
        {(user?.fullName ?? user?.username ?? 'A').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-graphite">{user?.fullName ?? user?.username}</div>
        <div className="text-xs text-stone-500">@{user?.username}</div>
      </div>
      <button
        onClick={logout}
        title="Выйти"
        className="rounded-lg p-2 text-stone-600 transition hover:bg-rose-500/15 hover:text-rose-700"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setMobileOpen(false), [location.pathname])

  return (
    <div className="min-h-screen">
      <AnimatedBackground />

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-graphite/10 bg-milk/85 p-5 backdrop-blur-xl lg:flex">
        <div className="mb-10 px-1">
          <Logo />
        </div>
        <NavItems />
        <div className="mt-auto">
          <UserCard />
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-graphite/10 bg-milk/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-stone-700 hover:bg-graphite/10">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-graphite/10 bg-milk p-5 lg:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-stone-600 hover:bg-graphite/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto">
                <UserCard />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
