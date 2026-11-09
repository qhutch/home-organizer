'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import ActionBar from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { setRecipeReview } from '@/app/(app)/recipes/actions'

type Review = { rating: number | null; comment: string }

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
// (action principale, rose plein, à droite). Le mode cuisine et l'ajout aux courses arrivent bientôt.
// La fiche « Note et commentaire » s'ouvre depuis le + de la section Commentaire.
export default function RecipeBar({ id, rating, comment, example }: { id: string; rating: number | null; comment: string | null; example: boolean }) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const [soon, setSoon] = useState<string | null>(null)

  // Le + de la section Commentaire ouvre la fiche du bas
  useEffect(() => {
    const open = () => setReviewOpen(true)
    window.addEventListener(OPEN_REVIEW, open)
    return () => window.removeEventListener(OPEN_REVIEW, open)
  }, [])

  useEffect(() => {
    if (!soon) return
    const t = setTimeout(() => setSoon(null), 2500)
    return () => clearTimeout(t)
  }, [soon])

  return (
    <>
      {soon && (
        <p role="status" className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit rounded-full bg-ink text-surface text-sm px-4 py-2">
          {soon}
        </p>
      )}
      <ActionBar detached>
        <button
          type="button"
          onClick={() => setSoon('L’ajout aux courses arrive bientôt')}
          aria-label="Ajouter les ingrédients à la liste de courses"
          className={`btn-feature-outline btn-lg flex-1 min-w-0 !px-4 ${FEATURES.recipes.text}`}
        >
          <Icon name="shopping" size={20} /> Ajouter aux courses
        </button>
        <button
          type="button"
          onClick={() => setSoon('Le mode cuisine arrive bientôt')}
          className={`btn-feature btn-lg ${FEATURES.recipes.fill}`}
        >
          <Icon name="recipes" size={20} /> Cuisiner
        </button>
      </ActionBar>

      {reviewOpen && (
        <ReviewSheet id={id} initial={{ rating, comment: comment ?? '' }} example={example} onClose={() => setReviewOpen(false)} />
      )}
    </>
  )
}

// Fiche « Note et commentaire » : la note s'enregistre au toucher, le commentaire en quittant le champ ou en fermant.
function ReviewSheet({ id, initial, example, onClose }: { id: string; initial: Review; example: boolean; onClose: () => void }) {
  const [review, setReview] = useState(initial)
  const saved = useRef(initial)
  const [, startTransition] = useTransition()

  function save(next: Review) {
    if (example) return
    if (next.rating === saved.current.rating && next.comment.trim() === saved.current.comment.trim()) return
    saved.current = next
    startTransition(() => setRecipeReview(id, next))
  }

  function close() {
    save(review)
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

  function rate(n: number) {
    const next = { ...review, rating: review.rating === n ? null : n }
    setReview(next)
    save(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button type="button" aria-label="Fermer" onClick={close} className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full sm:max-w-md bg-page rounded-t-[2rem] sm:rounded-[2rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <h3 id="review-title" className="font-display font-semibold text-2xl tracking-tight flex-1">Note et commentaire</h3>
          <button type="button" onClick={close} className="text-ink-muted hover:text-ink text-2xl leading-none px-1" aria-label="Fermer">×</button>
        </div>

        <fieldset>
          <legend className="eyebrow mb-2">Note</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => rate(n)}
                aria-label={`${n} sur 5`}
                aria-pressed={review.rating === n}
                className={`w-12 h-12 rounded-full flex items-center justify-center hover:bg-coconut ${review.rating && n <= review.rating ? 'text-pink-deep' : 'text-ink-muted'}`}
              >
                <Icon name="star" size={30} className={review.rating && n <= review.rating ? 'fill-current' : ''} />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="review-comment" className="eyebrow">Commentaire</label>
          <textarea
            id="review-comment"
            value={review.comment}
            onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
            onBlur={() => save(review)}
            rows={4}
            placeholder="Un peu trop salé, doubler la sauce…"
            className="field resize-none"
          />
        </div>

        {example && <p className="text-xs text-ink-muted">Recette d’exemple : la note et le commentaire ne sont pas gardés.</p>}

        <button type="button" onClick={close} className="btn self-end">OK</button>
      </div>
    </div>
  )
}
