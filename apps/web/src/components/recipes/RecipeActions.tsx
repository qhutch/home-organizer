'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { setRecipeFavorite } from '@/app/(app)/recipes/actions'

// Favori (enregistré tout de suite) et modification d'une recette (on la supprime depuis là), sur sa fiche.
export default function RecipeActions({ id, favorite }: { id: string; favorite: boolean }) {
  const [isFavorite, setIsFavorite] = useState(favorite)
  const [, startTransition] = useTransition()

  function toggleFavorite() {
    const next = !isFavorite
    setIsFavorite(next)
    startTransition(() => setRecipeFavorite(id, next))
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={toggleFavorite}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        className="icon-btn text-pink-deep"
      >
        <Icon name="heart" className={isFavorite ? 'fill-current' : ''} />
      </button>
      <Link href={`/recipes/${id}/modifier`} aria-label="Modifier la recette" className="icon-btn text-pink-deep">
        <Icon name="pencil" />
      </Link>
    </div>
  )
}
