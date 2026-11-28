import { useEffect, useState } from 'react'
import { FolderOpen, LogOut, Trash2 } from 'lucide-react'
import {
  changePassword,
  deleteAccount,
  logout,
  logoutOthers,
  openAccountPrompt,
  resetPassword,
  updateProfile,
  useAccount,
} from '../account'
import { accessLabel, activeSubscription, formatDate, projectAccess } from '../billing/entitlements'
import { useBilling } from '../billing/paymentService'
import { navigate } from '../nav'
import { formatDin, packageName } from '../prices'
import { formatRange } from '../pricing'
import { ConfirmDone } from '../components/ConfirmDone'
import { formatSavedAt } from '../projects'
import { skillName } from './craftsmen'

const INQUIRY_STATUS = {
  pending: { label: 'Čeka odobrenje', tone: 'bg-amber-100 text-amber-950' },
  sent: { label: 'Kod majstora, čeka cenu', tone: 'bg-sky-100 text-sky-950' },
  accepted: { label: 'Majstor dao cenu', tone: 'bg-emerald-100 text-emerald-950' },
  paid: { label: 'Kontakt otvoren', tone: 'bg-emerald-100 text-emerald-950' },
  declined: { label: 'Majstor odbio', tone: 'bg-stone-200 text-stone-800' },
  rejected: { label: 'Nije odobren', tone: 'bg-stone-200 text-stone-800' },
  withdrawn: { label: 'Povučen', tone: 'bg-stone-200 text-stone-800' },
}

const LEAD_STATUS = {
  pending: { label: 'Čeka odobrenje', tone: 'bg-amber-100 text-amber-950' },
  rejected: { label: 'Nije odobren', tone: 'bg-stone-200 text-stone-800' },
  sold: { label: 'Firma prijavila kupovinu', tone: 'bg-emerald-100 text-emerald-950' },
}

export function AccountPage({ projects, activeProjectId, onOpenProject, onDeleteProject }) {
  const account = useAccount()
  const billingState = useBilling()
  const [inquiries, setInquiries] = useState([])
  const [leads, setLeads] = useState([])
  const userId = account.user?.id ?? null

  useEffect(() => {
    if (!userId) return undefined
    let stop = false
    async function load() {
      const [mine, partnerLeads] = await Promise.all([
        fetch('/api/customer/inquiries').then((response) => response.json()),
        fetch('/api/customer/leads').then((response) => response.json()),
      ])
      if (stop) return
      setInquiries(mine.inquiries || [])
      setLeads(partnerLeads.leads || [])
    }
    load().catch(() => {})
    const timer = setInterval(() => load().catch(() => {}), 15000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [userId])

  if (account.status === 'loading') return null
  if (!account.user) {
    return (
      <Page>
        <h1 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">Moj nalog</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-stone-700">
          Na nalogu su tvoji sačuvani projekti, upiti majstorima i firmama i kupljeni paketi. Crtanje u konfiguratoru ne traži nalog, a trenutni crtež se pamti u ovom pregledaču.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => openAccountPrompt('', 'login')} className="btn-tape px-5 py-2.5 text-base">
            Prijavi se
          </button>
          <button type="button" onClick={() => openAccountPrompt('', 'register')} className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-base font-medium text-stone-900">
            Napravi nalog
          </button>
        </div>
      </Page>
    )
  }

  const subscription = activeSubscription(billingState)
  const known = new Set(projects.map((project) => project.id))
  const looseInquiries = inquiries.filter((item) => !known.has(item.projectId))
  const looseLeads = leads.filter((item) => !known.has(item.projectId))

  async function withdraw(id) {
    const response = await fetch(`/api/customer/inquiries/${id}/withdraw`, { method: 'POST' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Upit nije povučen.')
    setInquiries((current) => current.map((item) => (item.id === id ? payload.inquiry : item)))
  }

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-none font-bold text-stone-950 md:text-5xl">{account.user.name}</h1>
          <p className="mt-2 text-sm text-stone-600">
            {account.user.email}
            {account.user.google ? ' · povezan Google nalog' : ''}
          </p>
        </div>
        <button type="button" onClick={() => logout()} className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800">
          <LogOut size={15} />
          Odjavi se
        </button>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold text-stone-950">Moji projekti</h2>
          <button type="button" onClick={() => navigate('/konfigurator')} className="text-sm font-medium text-stone-800 underline underline-offset-2">
            Otvori konfigurator
          </button>
        </div>
        {projects.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white px-4 py-8 text-center text-sm text-stone-500 ring-1 ring-stone-200">
            Još nema sačuvanih projekata. U konfiguratoru složi objekat i klikni Sačuvaj.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                open={project.id === activeProjectId}
                access={projectAccess(billingState, project.id)}
                inquiries={inquiries.filter((item) => item.projectId === project.id)}
                leads={leads.filter((item) => item.projectId === project.id)}
                onOpen={() => onOpenProject(project.id)}
                onDelete={() => onDeleteProject(project.id)}
                onWithdraw={withdraw}
              />
            ))}
          </ul>
        )}
        {(looseInquiries.length > 0 || looseLeads.length > 0) && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-stone-700">Upiti za projekte koji više nisu sačuvani</h3>
            <div className="mt-2 space-y-2">
              {looseInquiries.map((item) => (
                <InquiryRow key={item.id} item={item} onWithdraw={withdraw} showProject />
              ))}
              {looseLeads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} showProject />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card title="Paketi">
          {subscription ? (
            <p className="text-[15px] text-stone-800">
              Pretplata <strong>{subscription.plan.name}</strong> važi do {formatDate(subscription.paidUntil)}.
            </p>
          ) : (
            <p className="text-[15px] text-stone-700">Nemaš pretplatu. Paket Uradi sam se kupuje za jedan projekat i vidi se uz taj projekat gore.</p>
          )}
          <button type="button" onClick={() => navigate('/paketi')} className="mt-3 text-sm font-medium text-stone-900 underline underline-offset-2">
            Pogledaj pakete
          </button>
        </Card>
        <ProfileForm user={account.user} />
        <PasswordForm user={account.user} />
        <SecurityCard user={account.user} />
      </section>
    </Page>
  )
}

function ProjectCard({ project, open, access, inquiries, leads, onOpen, onDelete, onWithdraw }) {
  const [confirming, setConfirming] = useState(false)
  const badge = accessLabel(access)
  const { width, length } = project.scene.dimensions
  return (
    <li className={`rounded-xl bg-white p-4 ring-1 ${open ? 'ring-accent-400' : 'ring-stone-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-stone-950">{project.name}</h3>
          <p className="text-sm text-stone-500">
            {meters(width)} × {meters(length)} m{(project.scene.units || 1) > 1 ? `, ${project.scene.units} u nizu` : ''} · izmenjen {formatSavedAt(project.updatedAt)}
            {open ? ' · otvoren u konfiguratoru' : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <Chip tone={badge ? (access.full ? 'bg-tape-soft text-stone-950' : 'bg-stone-100 text-stone-700') : 'bg-stone-100 text-stone-700'}>{badge || 'Besplatno: orijentaciona cena'}</Chip>
            {inquiries.length === 0 && leads.length === 0 && <Chip tone="bg-stone-100 text-stone-700">Nacrt, bez upita</Chip>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onOpen} className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">
            <FolderOpen size={15} />
            Otvori
          </button>
          <button type="button" aria-label={`Obriši ${project.name}`} onClick={() => setConfirming((value) => !value)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-50 hover:text-red-600">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {confirming && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-950">
          Obrisati „{project.name}”? Poslati upiti ostaju.
          <button type="button" onClick={onDelete} className="rounded-md bg-red-700 px-2.5 py-1 font-medium text-white">
            Obriši
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 text-red-900">
            Odustani
          </button>
        </div>
      )}
      {(inquiries.length > 0 || leads.length > 0) && (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          {inquiries.map((item) => (
            <InquiryRow key={item.id} item={item} onWithdraw={onWithdraw} />
          ))}
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </li>
  )
}

function InquiryRow({ item, onWithdraw, showProject = false }) {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const status = INQUIRY_STATUS[item.status] ?? { label: 'Čeka odgovor', tone: 'bg-stone-100 text-stone-700' }
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-stone-900">
          {skillName(item.skill)} · {item.craftsman?.shop}, {item.craftsman?.city}
        </span>
        <Chip tone={status.tone}>{status.label}</Chip>
      </div>
      <p className="mt-1 text-stone-600">
        {showProject && item.projectName ? `${item.projectName} · ` : ''}
        Poslato {formatDate(new Date(item.createdAt).getTime())}
        {item.orientationTotal > 0 ? ` · okvirno ${formatRange(item.orientationTotal)}` : ''}
        {item.craftsmanPrice != null ? ` · cena majstora ${formatDin(item.craftsmanPrice)}` : ''}
      </p>
      {item.craftsman?.phone && <p className="mt-1 text-stone-800">Telefon majstora: {item.craftsman.phone}</p>}
      <ConfirmDone kind="inquiry" item={item} />
      {(item.canWithdraw || item.canSwitch) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setProblem('')
            onWithdraw(item.id)
              .catch((error) => setProblem(error.message))
              .finally(() => setBusy(false))
          }}
          className="mt-2 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-800"
        >
          {item.canSwitch ? 'Povuci, majstor ne odgovara' : 'Povuci upit'}
        </button>
      )}
      {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
    </div>
  )
}

function LeadRow({ lead, showProject = false }) {
  const status = LEAD_STATUS[lead.status] ?? { label: 'Poslato firmi', tone: 'bg-sky-100 text-sky-950' }
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-stone-900">
          Materijal: {packageName(lead.package)} · {lead.partner?.name}
        </span>
        <Chip tone={status.tone}>{status.label}</Chip>
      </div>
      <p className="mt-1 text-stone-600">
        {showProject && lead.projectName ? `${lead.projectName} · ` : ''}
        Kod {lead.code} · {formatDin(lead.offerTotal)} po cenovniku firme
      </p>
      {lead.partner?.phone && <p className="mt-1 text-stone-800">Telefon firme: {lead.partner.phone}</p>}
      <ConfirmDone kind="lead" item={lead} />
    </div>
  )
}

function ProfileForm({ user }) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone)
  const [state, setState] = useState({ busy: false, message: '', error: '' })
  return (
    <Card title="Podaci">
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setState({ busy: true, message: '', error: '' })
          try {
            await updateProfile({ name, phone })
            setState({ busy: false, message: 'Sačuvano.', error: '' })
          } catch (error) {
            setState({ busy: false, message: '', error: error.message })
          }
        }}
      >
        <Field label="Ime i prezime" value={name} onChange={setName} autoComplete="name" />
        <Field label="Telefon" value={phone} onChange={setPhone} autoComplete="tel" />
        <p className="text-xs text-stone-500">Ime i telefon se sami upisuju u upit majstoru. Imejl naloga je {user.email}.</p>
        <Status {...state} />
        <button type="submit" disabled={state.busy} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Sačuvaj podatke
        </button>
      </form>
    </Card>
  )
}

function PasswordForm({ user }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [state, setState] = useState({ busy: false, message: '', error: '' })
  return (
    <Card title={user.hasPassword ? 'Promena lozinke' : 'Lozinka'}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setState({ busy: true, message: '', error: '' })
          try {
            await changePassword(current, next)
            setCurrent('')
            setNext('')
            setState({ busy: false, message: 'Lozinka je promenjena. Ostali uređaji su odjavljeni.', error: '' })
          } catch (error) {
            setState({ busy: false, message: '', error: error.message })
          }
        }}
      >
        {user.hasPassword ? (
          <Field label="Trenutna lozinka" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
        ) : (
          <p className="text-sm text-stone-700">Prijavljuješ se preko Google-a. Možeš da dodaš i lozinku, pa da se prijavljuješ imejlom.</p>
        )}
        <Field label="Nova lozinka, bar 8 znakova" type="password" value={next} onChange={setNext} autoComplete="new-password" />
        <Status {...state} />
        <button type="submit" disabled={state.busy || next.length < 8} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {user.hasPassword ? 'Promeni lozinku' : 'Dodaj lozinku'}
        </button>
        {user.hasPassword && (
          <p className="text-xs text-stone-500">
            Ne sećaš se trenutne?{' '}
            <button type="button" onClick={() => openAccountPrompt('', 'forgot')} className="underline underline-offset-2">
              Pošalji link za novu lozinku
            </button>
          </p>
        )}
      </form>
    </Card>
  )
}

function SecurityCard({ user }) {
  const [others, setOthers] = useState('')
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [problem, setProblem] = useState('')
  return (
    <Card title="Sigurnost">
      <button
        type="button"
        onClick={() =>
          logoutOthers()
            .then(() => setOthers('Ostali uređaji su odjavljeni.'))
            .catch((error) => setOthers(error.message))
        }
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800"
      >
        Odjavi sve ostale uređaje
      </button>
      {others && <p className="mt-2 text-sm text-stone-700">{others}</p>}
      <div className="mt-6 border-t border-stone-200 pt-4">
        {!deleting ? (
          <button type="button" onClick={() => setDeleting(true)} className="text-sm font-medium text-red-700 underline underline-offset-2">
            Obriši nalog
          </button>
        ) : (
          <form
            className="space-y-2"
            onSubmit={async (event) => {
              event.preventDefault()
              setProblem('')
              try {
                await deleteAccount(confirm)
                navigate('/')
              } catch (error) {
                setProblem(error.message)
              }
            }}
          >
            <p className="text-sm leading-relaxed text-red-950">
              Brišu se svi sačuvani projekti i kupljeni paketi. Poslati upiti ostaju kod majstora i firmi. Ovo se ne može vratiti. Za potvrdu upiši imejl naloga.
            </p>
            <input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={user.email} className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm" />
            {problem && <p className="text-sm text-red-700">{problem}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={confirm.trim().toLowerCase() !== user.email} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
                Trajno obriši
              </button>
              <button type="button" onClick={() => setDeleting(false)} className="px-3 py-2 text-sm text-stone-600">
                Odustani
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  )
}

export function ResetPasswordPage({ token }) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Page narrow>
      <h1 className="text-4xl leading-none font-bold text-stone-950">Nova lozinka</h1>
      <form
        className="mt-6 space-y-3 rounded-xl bg-white p-5 ring-1 ring-stone-200"
        onSubmit={async (event) => {
          event.preventDefault()
          if (password !== repeat) {
            setProblem('Lozinke se ne poklapaju.')
            return
          }
          setBusy(true)
          setProblem('')
          try {
            await resetPassword(token, password)
            navigate('/nalog')
          } catch (error) {
            setProblem(error.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Nova lozinka, bar 8 znakova" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <Field label="Ponovi lozinku" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" />
        {problem && <p className="text-sm text-red-700">{problem}</p>}
        <button type="submit" disabled={busy || password.length < 8} className="btn-tape w-full px-4 py-3 text-base disabled:opacity-50">
          Sačuvaj lozinku i prijavi me
        </button>
        <p className="text-xs text-stone-500">Posle promene svi ostali uređaji se odjavljuju.</p>
      </form>
    </Page>
  )
}

function Page({ children, narrow = false }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={`mx-auto px-4 py-10 md:px-6 ${narrow ? 'max-w-md' : 'max-w-5xl'}`}>{children}</div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
      <h2 className="mb-3 text-lg font-semibold text-stone-950">{title}</h2>
      {children}
    </section>
  )
}

function Chip({ tone, children }) {
  return <span className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${tone}`}>{children}</span>
}

function Field({ label, value, onChange, type = 'text', autoComplete }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-stone-700">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[15px]" />
    </label>
  )
}

function Status({ message, error }) {
  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (message) return <p className="text-sm text-emerald-800">{message}</p>
  return null
}

function meters(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')
}
