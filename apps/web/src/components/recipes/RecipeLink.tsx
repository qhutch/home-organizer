'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import RecipeForm from '@/components/recipes/RecipeForm'
import type { PickedPhoto } from '@/components/recipes/PhotoPicker'
import { FEATURES } from '@/lib/ui/features'
import { shrinkPhoto } from '@/lib/recipes/photo'
import type { ImportedRecipe } from '@/lib/recipes/import-code'
import { readRecipeLink } from '@/app/(app)/recipes/actions'

// Depuis un lien : on colle l'adresse d'une recette (Marmiton, Marie Claire…), Hestia lit la page
// et la recette s'affiche dans le formulaire pour qu'on la vérifie.
export default function RecipeLink({ equipmentSuggestions }: { equipmentSuggestions: string[] }) {
  const [link, setLink] = useState('')
  const [recipe, setRecipe] = useState<ImportedRecipe | null>(null)
  const [photo, setPhoto] = useState<PickedPhoto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function read(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await readRecipeLink(link)
      if (!result.ok) {
        setError(result.error)
        return
      }
      let picked: PickedPhoto | null = null
      if (result.photo) {
        try {
          const bytes = Uint8Array.from(atob(result.photo.data), c => c.charCodeAt(0))
          const blob = await shrinkPhoto(new File([bytes], 'photo', { type: result.photo.type }))
          picked = { blob, url: URL.createObjectURL(blob) }
        } catch {
          picked = null
        }
      }
      setPhoto(picked)
      setRecipe(result.recipe)
    })
  }

  if (recipe) {
    return (
      <>
        <h1 className="text-3xl mb-4">Vérifie la recette</h1>
        <button type="button" onClick={() => { setRecipe(null); setLink(''); setPhoto(null) }} className={`text-sm font-medium underline mb-6 ${FEATURES.recipes.text}`}>
          Coller un autre lien
        </button>
        <RecipeForm initial={recipe} initialPhoto={photo} equipmentSuggestions={equipmentSuggestions} />
      </>
    )
  }

  return (
    <>
      <h1 className="text-3xl mb-6">Depuis un lien</h1>
      <form onSubmit={read} className="card flex flex-col gap-3">
        <label htmlFor="recipe-link" className="font-medium">Colle le lien de la recette</label>
        <input
          id="recipe-link"
          type="url"
          inputMode="url"
          required
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder="https://www.marmiton.org/…"
          className="field"
          aria-describedby={error ? 'recipe-link-error' : undefined}
        />
        {error && (
          <p id="recipe-link-error" className="text-sm text-pink-deep" role="status">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending || !link.trim()} className={`btn-feature ${FEATURES.recipes.fill} self-start`}>
          <Icon name="link" size={20} /> {pending ? 'Lecture…' : 'Lire la recette'}
        </button>
      </form>
    </>
  )
}
