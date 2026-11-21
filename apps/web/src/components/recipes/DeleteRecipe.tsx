'use client'

import { useState, useTransition } from 'react'
import { deleteRecipe } from '@/app/(app)/recipes/actions'
import Icon from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'

// « Supprimer la recette » (bas de la fiche et du formulaire « Modifier ») : une fiche demande confirmation,
// puis la recette et ses photos sont supprimées et on revient à la bibliothèque.
export default function DeleteRecipe({ id, title, disabled }: { id: string; title: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={disabled || pending} className="btn-danger">
        <Icon name="trash" /> Supprimer la recette
      </button>
      {open && (
        <Sheet title={`Supprimer « ${title} » ?`} onClose={() => !pending && setOpen(false)}>
          <p className="text-ink-muted">Ses photos partent avec elle. On ne pourra pas la récupérer.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className="btn-outline">
              Annuler
            </button>
            <button type="button" onClick={() => startTransition(() => deleteRecipe(id))} disabled={pending} className="btn-danger">
              <Icon name="trash" /> {pending ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
