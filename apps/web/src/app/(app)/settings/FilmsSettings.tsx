'use client'

import { useState, useTransition } from 'react'
import { saveTmdbKeyAction, saveWatchPlatforms } from '@/app/(app)/films/actions'
import { PLATFORMS, PLATFORM_BY_ID, type PlatformSettings } from '@/lib/films/platforms'

// Réglages › Films et séries : la clé TMDB (pour trouver les films) et les abonnements du foyer,
// mis en avant sur chaque fiche. Une plateforme peut être incluse dans une autre (Apple TV+ dans Canal+).
export default function FilmsSettings({ hasKey, platforms: initial }: { hasKey: boolean; platforms: PlatformSettings }) {
  const [platforms, setPlatforms] = useState(initial)
  const [editingKey, setEditingKey] = useState(!hasKey)
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function choose(id: string, choice: string | null) {
    const next = { ...platforms }
    if (choice) next[id] = choice
    else delete next[id]
    setPlatforms(next)
    startTransition(() => saveWatchPlatforms(next))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="card flex flex-col gap-3">
        <p className="text-sm font-medium">Clé TMDB</p>
        {editingKey ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={e => {
              e.preventDefault()
              startTransition(async () => {
                setError(null)
                const result = await saveTmdbKeyAction(key)
                if (result.error) setError(result.error)
                else {
                  setEditingKey(false)
                  setKey('')
                }
              })
            }}
          >
            <input
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Clé de l’API (32 caractères)"
              aria-label="Clé TMDB"
              autoComplete="off"
              spellCheck={false}
              className="field font-mono text-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button type="submit" className="btn" disabled={pending || !key.trim()}>{pending ? 'Vérification…' : 'Enregistrer la clé'}</button>
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="btn-outline">Obtenir une clé</a>
            </div>
            {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-ink-muted flex-1">Enregistrée</p>
            <button type="button" className="btn-outline" onClick={() => setEditingKey(true)}>Changer</button>
          </div>
        )}
      </div>

      <div className="card flex flex-col">
        <p className="text-sm font-medium mb-1">Nos abonnements</p>
        {PLATFORMS.filter(p => !p.free).map((p, i) => {
          const choice = platforms[p.id] ?? null
          return (
            <div key={p.id} className={`flex items-center gap-3 py-2.5 flex-wrap ${i ? 'border-t border-line' : ''}`}>
              <span className="flex-1 min-w-24 font-medium">{p.name}</span>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" className={`chip ${!choice ? 'is-active' : ''}`} aria-pressed={!choice} onClick={() => choose(p.id, null)}>Non</button>
                <button type="button" className={`chip ${choice === 'own' ? 'is-active' : ''}`} aria-pressed={choice === 'own'} onClick={() => choose(p.id, 'own')}>Oui</button>
                {p.via?.map(v => (
                  <button key={v} type="button" className={`chip ${choice === v ? 'is-active' : ''}`} aria-pressed={choice === v} onClick={() => choose(p.id, v)}>
                    Dans {PLATFORM_BY_ID.get(v)?.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
