import { useEffect, useState } from 'react'
import { BADGE_TIERS, badgeFor, jobsLabel, nextBadge, yearsLabel } from '../badges'
import { navigate } from '../nav'
import { packageName } from '../prices'
import { TrustBadge } from '../components/TrustBadge'
import { skillName } from './craftsmen'

// Javni profil firme ili majstora: šta radi, gde i koliko je poslova završio preko Mere.
export function ProfilePage({ kind, id }) {
  const [profile, setProfile] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let stop = false
    fetch(`/api/profiles/${kind}/${encodeURIComponent(id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (stop) return
        if (payload?.profile) setProfile(payload.profile)
        else setMissing(true)
      })
      .catch(() => !stop && setMissing(true))
    return () => {
      stop = true
    }
  }, [kind, id])

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-stone-950">Profil nije pronađen</h1>
        <p className="mt-2 text-stone-600">Firma ili majstor možda više ne radi preko Mere.</p>
      </div>
    )
  }
  if (!profile) return <div className="mx-auto max-w-3xl px-6 py-10 text-stone-500">Učitavam profil…</div>

  const partner = kind === 'partner'
  const name = partner ? profile.name : profile.shop
  const jobs = profile.completedJobs || 0
  const badge = badgeFor(jobs)
  const next = nextBadge(jobs)
  const terms = profile.terms
  const joined = profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' }) : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-stone-500">{partner ? 'Firma' : profile.profession}</p>
        <h1 className="mt-1 text-4xl leading-none font-bold text-stone-950 md:text-5xl">{name}</h1>
        <p className="mt-2 text-stone-700">
          {profile.city}
          {joined ? ` · na Meri od ${joined}` : ''}
        </p>
        <div className="mt-4">
          <TrustBadge jobs={jobs} verified={profile.verified} size="md" />
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-stone-300 bg-white p-4">
            <h2 className="font-semibold text-stone-950">Šta radi</h2>
            <ul className="mt-2 space-y-1 text-sm text-stone-700">
              {(partner ? profile.packages.map(packageName) : profile.skills.map(skillName)).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {!partner && profile.bio && <p className="mt-2 text-sm text-stone-600">{profile.bio}</p>}
            {partner && profile.delivery && <p className="mt-2 text-sm text-stone-600">Dostava: {profile.delivery}</p>}
            {partner && profile.website && (
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer nofollow" className="mt-2 block text-sm text-stone-800 underline">
                {profile.website}
              </a>
            )}
          </div>
          <div className="rounded-xl border border-stone-300 bg-white p-4">
            <h2 className="font-semibold text-stone-950">Poslovi preko Mere</h2>
            <p className="font-display mt-2 text-4xl font-bold text-stone-950">{jobs}</p>
            <p className="text-sm text-stone-600">{jobsLabel(jobs)}</p>
            {next && (
              <p className="mt-2 text-xs text-stone-500">
                {badge ? `Do oznake ${next.name}: još ${next.min - jobs}.` : 'Oznaku Proveren dobija posle prvog posla koji kupac potvrdi.'}
              </p>
            )}
          </div>
        </section>

        {partner && terms && (
          <section className="mt-4 rounded-xl border border-stone-300 bg-white p-4">
            <h2 className="font-semibold text-stone-950">Uslovi</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <Term label="Garancija na konstrukciju" value={yearsLabel(terms.warrantyStructure)} />
              <Term label="Garancija na pokrivač i panele" value={yearsLabel(terms.warrantyCover)} />
              <Term label="Garancija na montažu" value={yearsLabel(terms.warrantyWork)} />
              <Term label="Rok montaže" value={terms.installDays ? `oko ${terms.installDays} dana` : '—'} />
              <Term label="Avans" value={terms.deposit || '—'} />
              <Term label="Cene u cenovniku" value={terms.pricesWithVat ? 'sa PDV-om' : 'bez PDV-a (Mera dodaje 20%)'} />
            </dl>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-stone-950">Kako se dobijaju oznake</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            Posao se broji tek kada kupac na svom nalogu potvrdi da je završen. Oznaku „PIB proveren“ dodeljuje Mera posle provere firme u registru APR.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {BADGE_TIERS.map((tier) => (
              <li key={tier.id} className={`rounded-full px-3 py-1 font-medium ring-1 ${tier.tone}`}>
                {tier.name} · od {tier.min} {tier.min === 1 ? 'posla' : 'poslova'}
              </li>
            ))}
          </ul>
        </section>

        <button type="button" onClick={() => navigate('/konfigurator')} className="mt-8 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700">
          Nacrtaj objekat i pošalji upit
        </button>
      </div>
    </div>
  )
}

function Term({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-stone-200 pb-1">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-medium text-stone-900">{value}</dd>
    </div>
  )
}
