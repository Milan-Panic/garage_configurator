import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { closeAccountPrompt, forgotPassword, login, loginWithGoogle, register, useAccount, useAccountPrompt } from '../account'

export function AccountHost() {
  const prompt = useAccountPrompt()
  if (!prompt) return null
  return <AccountModal key={`${prompt.mode}-${prompt.reason}`} prompt={prompt} />
}

const TITLES = { login: 'Prijava', register: 'Novi nalog', forgot: 'Nova lozinka' }

function AccountModal({ prompt }) {
  const dialog = useRef(null)
  const [mode, setMode] = useState(prompt.mode || 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const node = dialog.current
    if (node && !node.open) node.showModal()
  }, [])

  function switchMode(next) {
    setMode(next)
    setProblem('')
    setNotice('')
  }

  async function submit(event) {
    event.preventDefault()
    setProblem('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else if (mode === 'register') await register(name, email, password)
      else {
        await forgotPassword(email)
        setNotice('Ako nalog sa tim imejlom postoji, poslali smo link za novu lozinku. Link važi sat vremena.')
      }
    } catch (error) {
      setProblem(error.message)
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[15px]'

  return (
    <dialog
      ref={dialog}
      onClose={closeAccountPrompt}
      className="no-print m-auto w-[min(26rem,calc(100vw-1.5rem))] rounded-xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/60"
    >
      <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <h2 className="text-3xl leading-none font-bold">{TITLES[mode]}</h2>
          <button type="button" aria-label="Zatvori" onClick={() => dialog.current?.close()} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          {prompt.reason && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200">{prompt.reason}</p>}

          {mode !== 'forgot' && (
            <>
              <GoogleButton onError={setProblem} />
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="h-px flex-1 bg-stone-200" />
                ili imejlom
                <span className="h-px flex-1 bg-stone-200" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <label className="block text-sm">
                <span className="mb-1 block text-stone-700">Ime i prezime</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required className={field} />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-stone-700">Imejl</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className={field} />
            </label>
            {mode !== 'forgot' && (
              <label className="block text-sm">
                <span className="mb-1 block text-stone-700">Lozinka{mode === 'register' ? ', bar 8 znakova' : ''}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  minLength={mode === 'register' ? 8 : undefined}
                  required
                  className={field}
                />
              </label>
            )}
            {problem && <p className="text-sm text-red-700">{problem}</p>}
            {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-950">{notice}</p>}
            <button type="submit" disabled={busy} className="btn-tape w-full px-4 py-3 text-base disabled:opacity-50">
              {busy ? 'Sačekaj…' : mode === 'login' ? 'Prijavi se' : mode === 'register' ? 'Napravi nalog' : 'Pošalji link'}
            </button>
          </form>

          <div className="space-y-1.5 text-sm text-stone-600">
            {mode === 'login' && (
              <>
                <p>
                  Nemaš nalog?{' '}
                  <button type="button" onClick={() => switchMode('register')} className="font-medium text-stone-900 underline underline-offset-2">
                    Napravi ga
                  </button>
                </p>
                <p>
                  <button type="button" onClick={() => switchMode('forgot')} className="underline underline-offset-2">
                    Zaboravljena lozinka
                  </button>
                </p>
              </>
            )}
            {mode !== 'login' && (
              <p>
                Već imaš nalog?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-medium text-stone-900 underline underline-offset-2">
                  Prijavi se
                </button>
              </p>
            )}
          </div>
          <p className="text-xs leading-relaxed text-stone-500">Nalog čuva tvoje projekte, upite i kupljene pakete. Crtanje u konfiguratoru ne traži nalog.</p>
        </div>
      </div>
    </dialog>
  )
}

// Pravo Google dugme kad je GOOGLE_CLIENT_ID podešen na serveru; do tada izgleda isto, ali samo obaveštava.
function GoogleButton({ onError }) {
  const { googleClientId } = useAccount()
  const slot = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!googleClientId) return undefined
    let stop = false
    loadGoogleScript()
      .then(() => {
        if (stop || !slot.current || !window.google?.accounts?.id) return
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => loginWithGoogle(response.credential).catch((error) => onError(error.message)),
        })
        window.google.accounts.id.renderButton(slot.current, { theme: 'outline', size: 'large', text: 'continue_with', locale: 'sr', width: slot.current.offsetWidth || 320 })
        setReady(true)
      })
      .catch(() => onError('Google prijava se nije učitala. Prijavi se imejlom.'))
    return () => {
      stop = true
    }
  }, [googleClientId, onError])

  if (googleClientId) {
    return (
      <div>
        <div ref={slot} className="flex min-h-11 w-full justify-center" />
        {!ready && <p className="text-center text-xs text-stone-500">Učitavam Google prijavu…</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onError('Prijava preko Google-a još nije uključena. Za sada se prijavi imejlom i lozinkom.')}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-[15px] font-medium text-stone-800 hover:bg-stone-50"
    >
      <GoogleMark />
      Nastavi preko Google-a
    </button>
  )
}

let googleScript = null

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        googleScript = null
        reject(new Error('Google skripta nije učitana.'))
      }
      document.head.appendChild(script)
    })
  }
  return googleScript
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
