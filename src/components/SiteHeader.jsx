import { navigate, ROUTES, usePath } from '../nav'

export function SiteHeader() {
  const path = usePath()
  const main = ROUTES.filter((route) => route.main && route.path !== '/')
  const partner = ROUTES.filter((route) => !route.main)

  return (
    <header className="flex shrink-0 items-stretch gap-4 bg-stone-900 px-4 text-stone-300 md:px-6">
      <a
        href="/"
        aria-label="Mera, početna strana"
        aria-current={path === '/' ? 'page' : undefined}
        onClick={(event) => {
          event.preventDefault()
          navigate('/')
        }}
        className="flex shrink-0 items-center gap-2.5 py-2.5"
      >
        <LogoMark />
        <span className="leading-none">
          <span className="font-display block text-[22px] font-bold tracking-wide text-white">Mera</span>
          <span className="mt-0.5 hidden text-[11px] text-stone-400 sm:block">Montažni objekti po meri</span>
        </span>
      </a>

      <nav className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] md:justify-center" aria-label="Glavni meni">
        {main.map((route) => (
          <NavLink key={route.path} route={route} active={path === route.path} />
        ))}
        <span className="mx-3 hidden h-5 w-px self-center bg-white/15 lg:block" />
        {partner.map((route) => (
          <NavLink key={route.path} route={route} active={path === route.path} subtle />
        ))}
      </nav>

      {path !== '/konfigurator' && (
        <button
          type="button"
          onClick={() => navigate('/konfigurator')}
          className="btn-tape my-2.5 hidden shrink-0 px-4 text-sm sm:inline-flex"
        >
          Složi objekat
        </button>
      )}
    </header>
  )
}

// Aktivna stavka nosi žutu crtu po donjoj ivici, kao oznaka na metru.
function NavLink({ route, active, subtle = false }) {
  return (
    <a
      href={route.path}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault()
        navigate(route.path)
      }}
      className={`flex shrink-0 items-center border-b-[3px] px-3 pt-[3px] transition-colors ${subtle ? 'text-[13px]' : 'text-[15px] font-semibold'} ${
        active
          ? 'border-tape text-white'
          : subtle
            ? 'border-transparent text-stone-400 hover:text-white'
            : 'border-transparent text-stone-300 hover:text-white'
      }`}
    >
      {route.label}
    </a>
  )
}

// Zabat objekta na osnovi sa graničnicima kote.
export function LogoMark({ size = 32 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect width="48" height="48" rx="6" fill="#f5b800" />
      <path d="M9 37V20l15-9 15 9v17" fill="none" stroke="#14191d" strokeWidth="4" />
      <path d="M9 37h30M9 32v10M39 32v10" stroke="#14191d" strokeWidth="3" />
    </svg>
  )
}
