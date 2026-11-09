'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import { deleteRecipe, setRecipeFavorite } from '@/app/(app)/recipes/actions'

// Favori (enregistré tout de suite) et suppression d'une recette, sur sa fiche.
export default function RecipeActions({ id, favorite }: { id: string; favorite: boolean }) {
  const [isFavorite, setIsFavorite] = useState(favorite)
  const [pending, startTransition] = useTransition()

  function toggleFavorite() {
    const next = !isFavorite
    setIsFavorite(next)
    startTransition(() => setRecipeFavorite(id, next))
  }

  function remove() {
    if (!window.confirm('Supprimer cette recette ? On ne pourra pas la récupérer.')) return
    startTransition(() => deleteRecipe(id))
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={toggleFavorite}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        className="w-11 h-11 rounded-full flex items-center justify-center text-pink-deep hover:bg-coconut"
      >
        <Icon name="heart" className={isFavorite ? 'fill-current' : ''} />
      </button>
      <button type="button" onClick={remove} disabled={pending} aria-label="Supprimer la recette" className="w-11 h-11 rounded-full flex items-center justify-center text-pink-deep hover:bg-coconut">
        <Icon name="trash" />
      </button>
    </div>
  )
}
