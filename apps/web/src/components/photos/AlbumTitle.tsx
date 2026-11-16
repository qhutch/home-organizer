'use client'

import { useEffect, useRef, useState } from 'react'
import { renamePhotoAlbum } from '@/app/(app)/photos/actions'

// Nom d'un album qu'on a créé dans Hestia : modifiable en place, enregistré en quittant le champ (ou Entrée)
export default function AlbumTitle({ album, name }: { album: string; name: string }) {
  const [value, setValue] = useState(name)
  const [saved, setSaved] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  async function save() {
    const title = value.trim().replace(/\s+/g, ' ')
    if (!title) return setValue(saved)
    if (title === saved) return
    setError(null)
    const result = await renamePhotoAlbum(album, title)
    if (!result.ok) {
      setValue(saved)
      return setError(result.error)
    }
    setSaved(title)
  }

  return (
    <div className="flex-1 min-w-0">
      <textarea
        ref={ref}
        value={value}
        onChange={e => setValue(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
        onBlur={save}
        aria-label="Nom de l’album"
        rows={1}
        maxLength={100}
        className="block w-full resize-none overflow-hidden bg-transparent font-display font-semibold text-2xl leading-tight focus:outline-none"
      />
      {error && <p className="text-sm text-pink-deep" role="alert">{error}</p>}
    </div>
  )
}
