'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import { connectNas, disconnectNas } from './actions'

type Connected = { url: string; account: string } | null

// Réglages › NAS : le NAS du foyer, pour ses photos (Synology Photos) et ses documents (WebDAV), par son tunnel
export default function NasStorage({ connected }: { connected: Connected }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (connected) {
    return (
      <div className="card flex items-center gap-3">
        <span className="icon-btn bg-prune-soft text-prune-deep shrink-0" aria-hidden><Icon name="server" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">NAS Synology</p>
          <p className="text-xs text-ink-muted truncate">{new URL(connected.url).host} · {connected.account}</p>
        </div>
        <button
          type="button"
          className="btn-danger"
          disabled={pending}
          onClick={() => startTransition(() => disconnectNas())}
        >
          Débrancher
        </button>
      </div>
    )
  }

  // Pas d'`action` sur le formulaire : React le viderait après chaque essai, même raté
  function submit(form: HTMLFormElement, force: boolean) {
    if (!form.reportValidity()) return
    const formData = new FormData(form)
    startTransition(async () => {
      setError(null)
      const result = await connectNas(formData, force)
      if (result.error) setError(result.error)
    })
  }

  return (
    <form
      className="card flex flex-col gap-3"
      onSubmit={e => {
        e.preventDefault()
        submit(e.currentTarget, false)
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Adresse du NAS
        <input name="url" className="field" placeholder="https://hestia-nas.tail1234.ts.net" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} required />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Clé du gardien
        <input name="gatekeeperKey" type="password" className="field" autoComplete="off" required />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Compte Synology
        <input name="account" className="field" placeholder="hestia" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} required />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mot de passe Synology
        <input name="password" type="password" className="field" autoComplete="off" required />
      </label>
      {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-outline" disabled={pending}>
          {pending ? 'Connexion au NAS…' : 'Brancher le NAS'}
        </button>
        {error && (
          <button type="button" className="btn-outline" disabled={pending} onClick={e => submit(e.currentTarget.form!, true)}>
            Enregistrer quand même
          </button>
        )}
      </div>
    </form>
  )
}
