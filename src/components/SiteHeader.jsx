import { ArrowRight } from 'lucide-react'
import { navigate, ROUTES, usePath } from '../nav'

export function SiteHeader() {
  const path = usePath()
  const main = ROUTES.filter((route) => route.main)
  const partner = ROUTES.filter((route) => !route.main)

  return (
    <header className="flex shrink-0 items-center gap-4 bg-[#17181a] px-4 py-2.5 text-stone-300 md:px-6">
      <a
        href="/"
        onClick={(event) => {
          event.preventDefault()
          navigate('/')
        }}
        className="flex shrink-0 items-center gap-2.5"
      >
        <LogoMark />
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-white">Mera</span>
          <span className="hidden text-[11px] text-stone-400 sm:block">Montažni objekti po meri.</span>
        </span>
      </a>

      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto md:justify-center" aria-label="Glavni meni">
        {main.map((route) => (
          <NavLink key={route.path} route={route} active={path === route.path} />
        ))}
        <span className="mx-2 hidden h-5 w-px bg-white/10 lg:block" />
        {partner.map((route) => (
          <NavLink key={route.path} route={route} active={path === route.path} subtle />
        ))}
      </nav>

      {path !== '/konfigurator' && (
        <button
          type="button"
          onClick={() => navigate('/konfigurator')}
          className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 sm:flex"
        >
          Složi objekat
          <ArrowRight size={15} />
        </button>
      )}
    </header>
  )
}

function NavLink({ route, active, subtle = false }) {
  return (
    <a
      href={route.path}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault()
        navigate(route.path)
      }}
      className={`shrink-0 rounded-lg px-3 py-1.5 transition ${subtle ? 'text-xs' : 'text-sm font-medium'} ${
        active ? 'bg-white/10 text-white' : subtle ? 'text-stone-500 hover:text-stone-200' : 'text-stone-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {route.label}
    </a>
  )
}

export function LogoMark({ size = 32 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#26282b" />
      <path d="M8 22 24 11l16 11v16H8z" fill="none" stroke="#f97316" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M15 38V27h18v11" fill="none" stroke="#fafaf9" strokeWidth="3" />
      <path d="M15 31h18M15 35h18" stroke="#fafaf9" strokeWidth="2" />
    </svg>
  )
}
