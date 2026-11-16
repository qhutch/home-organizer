'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { addPhotosFromNas } from '@/app/(app)/photos/actions'
import type { GridItem } from './AlbumGrid'

// Au plus 50 photos d'un coup : une photo d'un autre compte est copiée une à une par le serveur
const MAX_CHOSEN = 50

// Les photos d'un autre album, à cocher, puis « Ajouter N photos » : on revient dans l'album
export default function NasPicker({ album, albumName, from, items }: { album: string; albumName: string; from: string; items: GridItem[] }) {
  const router = useRouter()
  const [chosen, setChosen] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const count = `${chosen.size} ${chosen.size > 1 ? 'photos' : 'photo'}`

  function toggle(id: number) {
    setChosen(c => {
      const next = new Set(c)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_CHOSEN) next.add(id)
      return next
    })
  }

  async function add() {
    setBusy(true)
    setError(null)
    const result = await addPhotosFromNas(album, from, [...chosen])
    if (!result.ok) {
      setBusy(false)
      return setError(result.error)
    }
    if (result.failed) {
      setBusy(false)
      setChosen(new Set())
      return setError(`${result.failed} ${result.failed > 1 ? 'photos n’ont' : 'photo n’a'} pas pu être ${result.failed > 1 ? 'ajoutées' : 'ajoutée'}`)
    }
    router.replace(`/photos/${album}`)
  }

  return (
    <>
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
        {items.map(item => {
          const src = item.links[item.previews[0]]
          const on = chosen.has(item.id)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={on}
                aria-label={item.filename}
                className="relative block w-full aspect-square rounded-lg overflow-hidden bg-lavande-soft"
              >
                <span className="absolute inset-0 grid place-items-center text-lavande-deep"><Icon name={item.type === 'video' ? 'play' : 'photos'} size={28} /></span>
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element -- miniature servie par notre route
                  <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                )}
                <span
                  className={`absolute top-1 right-1 size-6 rounded-full grid place-items-center border-2 border-white ${on ? 'bg-lavande-deep text-white' : 'bg-ink/30'}`}
                  aria-hidden
                >
                  {on && <Icon name="check" size={16} />}
                </span>
                {on && <span className="absolute inset-0 ring-4 ring-inset ring-lavande-deep rounded-lg" aria-hidden />}
              </button>
            </li>
          )
        })}
      </ul>
      <ActionBar>
        <div className="flex flex-col items-center gap-2 w-full pointer-events-auto">
          {error && <p role="alert" className="rounded-full bg-surface text-pink-deep text-sm font-medium px-4 py-2">{error}</p>}
          <button
            type="button"
            className={`btn-feature btn-lg w-full ${FEATURES.photos.fill}`}
            onClick={add}
            disabled={busy || chosen.size === 0}
          >
            {busy ? 'Ajout…' : chosen.size === 0 ? 'Aucune photo sélectionnée' : `Ajouter ${count} à « ${albumName} »`}
          </button>
        </div>
      </ActionBar>
    </>
  )
}
