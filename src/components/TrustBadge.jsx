import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { badgeFor, jobsLabel } from '../badges'

// Bedž po broju završenih poslova i oznaka da je PIB proveren u APR-u.
export function TrustBadge({ jobs = 0, verified = false, showJobs = true, size = 'sm' }) {
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
      {verified && (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-900 ring-1 ring-sky-300">
          <ShieldCheck size={12} />
          PIB proveren
        </span>
      )}
      {showJobs && <span className="text-stone-500">{jobsLabel(jobs)}</span>}
    </span>
  )
}
