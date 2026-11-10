'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { ReviewFields, useReview, type Review } from '@/components/recipes/RecipeReview'
import { PEOPLE_CHANGED } from '@/components/recipes/RecipeIngredients'

const OPEN_REVIEW = 'hestia:open-review'

// Le + de la section Commentaire : ouvre la fiche « Note et commentaire »
export function OpenReviewButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_REVIEW))}
      aria-label={label}
      title={label}
      className={`icon-btn-fill ${FEATURES.recipes.fill}`}
    >
      <Icon name="plus" size={20} />
    </button>
  )
}

// Barre du bas de la fiche recette : « Ajouter aux courses » (btn-feature-outline, à gauche) et « Cuisiner »
// (action principale, rose plein, à droite). « Ajouter aux courses » ouvre sa page, pour le nombre de
// personnes choisi sur la fiche ; « Cuisiner » ouvre le mode cuisine pour ce même nombre.
// La fiche « Note et commentaire » s'ouvre depuis le + de la section Commentaire.
export default function RecipeBar({ id, rating, comment }: { id: string; rating: number | null; comment: string | null }) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const [people, setPeople] = useState<number | null>(null)

  useEffect(() => {
    const change = (e: Event) => setPeople((e as CustomEvent<number>).detail)
    window.addEventListener(PEOPLE_CHANGED, change)
    return () => window.removeEventListener(PEOPLE_CHANGED, change)
  }, [])

  // Le + de la section Commentaire ouvre la fiche du bas
  useEffect(() => {
    const open = () => setReviewOpen(true)
    window.addEventListener(OPEN_REVIEW, open)
    return () => window.removeEventListener(OPEN_REVIEW, open)
  }, [])

  return (
    <>
      <ActionBar detached>
        <Link
          href={`/recipes/${id}/courses${people ? `?personnes=${people}` : ''}`}
          aria-label="Ajouter les ingrédients à la liste de courses"
          className={`btn-feature-outline btn-lg flex-1 min-w-0 !px-4 ${FEATURES.recipes.text}`}
        >
          <Icon name="shopping" size={20} /> Ajouter aux courses
        </Link>
        <Link
          href={`/recipes/${id}/cuisiner${people ? `?personnes=${people}` : ''}`}
          className={`btn-feature btn-lg ${FEATURES.recipes.fill}`}
        >
          <Icon name="recipes" size={20} /> Cuisiner
        </Link>
      </ActionBar>

      {reviewOpen && (
        <ReviewSheet id={id} initial={{ rating, comment: comment ?? '' }} onClose={() => setReviewOpen(false)} />
      )}
    </>
  )
}

// Fiche « Note et commentaire » : la note s'enregistre au toucher, le commentaire en quittant le champ ou en fermant.
function ReviewSheet({ id, initial, onClose }: { id: string; initial: Review; onClose: () => void }) {
  const state = useReview(id, initial)

  function close() {
    state.save()
    onClose()
  }

  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button type="button" aria-label="Fermer" onClick={close} className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <h3 id="review-title" className="font-display font-semibold text-2xl tracking-tight flex-1">Note et commentaire</h3>
          <button type="button" onClick={close} className="text-ink-muted hover:text-ink text-2xl leading-none px-1" aria-label="Fermer">×</button>
        </div>

        <ReviewFields state={state} idPrefix="review" />

        <button type="button" onClick={close} className="btn self-end">OK</button>
      </div>
    </div>
  )
}
