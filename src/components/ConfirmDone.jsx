import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { ReviewForm } from './Reviews'

// Kupac potvrđuje da je posao završen. Tek tada se posao broji firmi ili majstoru
// i ulazi u njihov bedž, pa brojke na profilima ne mogu da se naduvaju. Posle potvrde može da oceni posao.
export function ConfirmDone({ kind, item }) {
  const [done, setDone] = useState(Boolean(item.completedAt))
  const [canReview, setCanReview] = useState(Boolean(item.canReview))
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const who = kind === 'lead' ? 'firmu' : 'majstora'

  if (done) {
    return (
      <div className="mt-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 size={14} /> Potvrdio si da je posao završen.{reviewed ? ' Hvala na oceni, pomaže drugim kupcima.' : ''}
        </p>
        {canReview && !reviewed && <ReviewForm kind={kind} jobId={item.id} who={who} onDone={() => setReviewed(true)} />}
      </div>
    )
  }
  if (!item.canConfirm) return null
  async function confirm() {
    setBusy(true)
    setProblem('')
    try {
      const response = await fetch(`/api/customer/${kind === 'lead' ? 'leads' : 'inquiries'}/${encodeURIComponent(item.id)}/done`, { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Potvrda nije sačuvana.')
      setDone(true)
      setCanReview(true)
    } catch (error) {
      setProblem(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-2">
      <button type="button" disabled={busy} onClick={confirm} className="rounded-md border border-emerald-600 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
        Posao je završen
      </button>
      <span className="ml-2 text-xs text-stone-500">Klikni kad je objekat gotov. Tako {kind === 'lead' ? 'firma' : 'majstor'} dobija završen posao na profilu, a ti možeš da ga oceniš.</span>
      {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
    </div>
  )
}
