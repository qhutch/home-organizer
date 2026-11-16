'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'

// Recherche de « Toutes les photos » (barre du bas) : un lieu, un album, un mois ou une année ; Entrée lance la recherche
export default function PhotoSearch({ query, favorites = false }: { query: string; favorites?: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(query)

  function search(text: string) {
    const q = text.trim()
    const params = new URLSearchParams({ ...(q ? { q } : {}), ...(favorites ? { favoris: '1' } : {}) })
    router.replace(params.size ? `/photos/toutes?${params}` : '/photos/toutes')
  }

  return (
    <ActionBar>
      <form
        className="flex items-center flex-1 min-w-0"
        role="search"
        onSubmit={e => {
          e.preventDefault()
          ;(e.currentTarget.querySelector('input') as HTMLInputElement | null)?.blur()
          search(value)
        }}
      >
        <span className="pl-3 text-ink-muted"><Icon name="search" size={20} /></span>
        <input
          type="search"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Lieu, album, mois, année…"
          aria-label="Chercher des photos par lieu, album, mois ou année"
          autoComplete="off"
          enterKeyHint="search"
          className="flex-1 min-w-0 bg-transparent px-2 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button type="button" onClick={() => { setValue(''); search('') }} className="icon-btn" aria-label="Effacer">
            <Icon name="close" size={20} />
          </button>
        )}
      </form>
    </ActionBar>
  )
}
