'use client'

import { useRef, useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import { setRecipeReview } from '@/app/(app)/recipes/actions'

export type Review = { rating: number | null; comment: string }

// Note et commentaire d'une recette : la note s'enregistre au toucher, le commentaire en quittant
// le champ (ou avec `save`, en fermant).
export function useReview(id: string, initial: Review) {
  const [review, setReview] = useState(initial)
  const saved = useRef(initial)
  const [, startTransition] = useTransition()

  function persist(next: Review) {
    if (next.rating === saved.current.rating && next.comment.trim() === saved.current.comment.trim()) return
    saved.current = next
    startTransition(() => setRecipeReview(id, next))
  }

  return {
    review,
    rate(n: number) {
      const next = { ...review, rating: review.rating === n ? null : n }
      setReview(next)
      persist(next)
    },
    setComment: (comment: string) => setReview(r => ({ ...r, comment })),
    save: () => persist(review),
  }
}

// Les étoiles puis le champ du commentaire (fiche « Note et commentaire », fin du mode cuisine).
// `compact` (une recette parmi d'autres, fin d'une semaine de batch cooking) : étoiles plus petites,
// libellés réservés aux lecteurs d'écran, champ plus court ; `name` dit de quelle recette il s'agit.
export function ReviewFields({ state, idPrefix, compact, name }: {
  state: ReturnType<typeof useReview>; idPrefix: string; compact?: boolean; name?: string
}) {
  const { review, rate, setComment, save } = state
  const of = name ? ` pour ${name}` : ''
  return (
    <>
      <fieldset>
        <legend className={compact ? 'sr-only' : 'eyebrow mb-2'}>Note{of}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => rate(n)}
              aria-label={`${n} sur 5`}
              aria-pressed={review.rating === n}
              className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center hover:bg-coconut ${review.rating && n <= review.rating ? 'text-pink-deep' : 'text-ink-muted'}`}
            >
              <Icon name="star" size={compact ? 24 : 30} className={review.rating && n <= review.rating ? 'fill-current' : ''} />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-comment`} className={compact ? 'sr-only' : 'eyebrow'}>Commentaire{of}</label>
        <textarea
          id={`${idPrefix}-comment`}
          value={review.comment}
          onChange={e => setComment(e.target.value)}
          onBlur={save}
          rows={compact ? 2 : 4}
          placeholder={compact ? 'Commentaire' : 'Un peu trop salé, doubler la sauce…'}
          className="field resize-none"
        />
      </div>
    </>
  )
}
