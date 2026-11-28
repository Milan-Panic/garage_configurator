import { BadgeCheck, Shield, ShieldCheck, Star } from 'lucide-react'
import { badgeFor, formatRating, jobsLabel, reviewsLabel } from '../badges'

// Bedž po broju završenih poslova, oznaka da je PIB proveren, Mera zaštita i ocene stvarnih kupaca.
export function TrustBadge({ jobs = 0, verified = false, protectedBy = false, reviews = null, showJobs = true, size = 'sm' }) {
  const badge = badgeFor(jobs)
  const text = size === 'sm' ? 'text-[11px]' : 'text-xs'
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${text}`}>
      {badge && (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ${badge.tone}`}>
          <BadgeCheck size={12} />
          {badge.name}
        </span>
      )}
      {protectedBy && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-950 ring-1 ring-amber-400" title="Avans po fazama, avansni račun, povraćaj avansa, pisana ponuda i javljanje istog dana">
          <Shield size={12} />
          Mera zaštita
        </span>
      )}
      {verified && (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-900 ring-1 ring-sky-300">
          <ShieldCheck size={12} />
          PIB proveren
        </span>
      )}
      {reviews?.count > 0 && (
        <span className="inline-flex items-center gap-1 font-medium text-stone-700">
          <Star size={12} className="fill-amber-400 text-amber-500" />
          {reviews.average ? `${formatRating(reviews.average)} · ` : ''}
          {reviewsLabel(reviews.count)}
        </span>
      )}
      {showJobs && <span className="text-stone-500">{jobsLabel(jobs)}</span>}
    </span>
  )
}
