import { navigate, ROUTES, usePath } from '../nav'

export function SiteHeader() {
  const path = usePath()

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-stone-300 bg-[#f7f4ef] px-4 py-3 md:px-6">
      <button type="button" onClick={() => navigate('/')} className="text-left">
        <span className="block text-[11px] tracking-wide text-stone-500 uppercase">Mera</span>
        <span className="block text-sm font-semibold text-stone-950">Složi garažu sam.</span>
      </button>
      <nav className="flex flex-wrap justify-end gap-1">
        {ROUTES.map((route) => {
          const active = path === route.path
          return (
            <a
              key={route.path}
              href={route.path}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault()
                navigate(route.path)
              }}
              className={`rounded-md px-3 py-2 text-sm ${
                active ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-200'
              }`}
            >
              {route.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
