import Emoji from '@/components/ui/Emoji'
import { emojiFor } from '@/lib/shopping/catalog'
import { formatQuantity } from '@/lib/recipes/ingredients'
import type { RecipeIngredient } from '@/types/database'

// Grille des tuiles, la même que la liste de courses
export const ingredientGrid = 'grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2'

const TILE = 'aspect-square h-auto rounded-3xl p-2 flex flex-col items-center justify-center gap-1 text-center bg-surface hairline text-ink'

// Tuile d'un ingrédient, à l'image des articles de courses (ItemTile) : emoji Fluent, nom, quantité.
// Avec onTap, la tuile devient un bouton (formulaire : ouvre la fiche de l'ingrédient).
export default function IngredientTile({ ingredient, onTap }: { ingredient: RecipeIngredient; onTap?: () => void }) {
  const detail = [ingredient.quantity !== null ? formatQuantity(ingredient.quantity) : null, ingredient.unit].filter(Boolean).join(' ')
  const content = (
    <>
      <Emoji name={emojiFor(ingredient.name)} size={40} />
      <span className="text-[13px] font-semibold leading-tight line-clamp-3 break-words w-full first-letter:uppercase">{ingredient.name}</span>
      {detail && <span className="text-[11px] leading-tight opacity-70 line-clamp-3 break-words w-full">{detail}</span>}
    </>
  )
  if (!onTap) return <div className={TILE}>{content}</div>
  return (
    <button type="button" onClick={onTap} className={`${TILE} w-full hover:bg-coconut/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-moss`}>
      {content}
    </button>
  )
}
