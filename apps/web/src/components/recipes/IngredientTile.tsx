import Emoji from '@/components/ui/Emoji'
import { emojiFor } from '@/lib/shopping/catalog'
import { formatQuantity } from '@/lib/recipes/ingredients'
import type { RecipeIngredient } from '@/types/database'

// Grille des tuiles, la même que la liste de courses
export const ingredientGrid = 'grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2'
// Grille du mode cuisine, en plus gros (tuiles `large`)
export const ingredientGridLarge = 'grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2'

const TILE = 'relative aspect-square h-auto rounded-3xl p-2 flex flex-col items-center justify-center gap-1 text-center'

// Tuile d'un ingrédient, à l'image des articles de courses (ItemTile) : emoji Fluent, nom, quantité.
// Avec onTap, la tuile devient un bouton (formulaire : ouvre la fiche de l'ingrédient).
// Avec `selected` (page « Ajouter aux courses »), elle se coche : fond crème et contour rose foncé ;
// décochée, sans fond, contour pointillé et emoji estompé, comme un article récent. `note` s'ajoute sous la quantité.
export default function IngredientTile({
  ingredient,
  emoji,
  onTap,
  selected,
  note,
  large = false,
}: {
  ingredient: RecipeIngredient
  emoji?: string | null
  onTap?: () => void
  selected?: boolean
  note?: string
  // Mode cuisine : emoji, nom et quantité en plus gros
  large?: boolean
}) {
  const detail = [ingredient.quantity !== null ? formatQuantity(ingredient.quantity) : null, ingredient.unit].filter(Boolean).join(' ')
  const checkable = selected !== undefined
  const look = !checkable
    ? 'bg-surface hairline text-ink'
    : selected
      ? 'bg-surface text-ink ring-2 ring-pink-deep'
      : 'text-ink-muted border-2 border-dashed border-line hover:border-ink-muted'
  const content = (
    <>
      <Emoji name={emojiFor(ingredient.name, null, ingredient.emoji ?? emoji)} size={large ? 56 : 40} className={checkable && !selected ? 'opacity-60' : ''} />
      <span className={`${large ? 'text-lg' : 'text-[13px]'} font-semibold leading-tight line-clamp-3 break-words w-full first-letter:uppercase`}>{ingredient.name}</span>
      {detail && <span className={`${large ? 'text-base' : 'text-[11px]'} leading-tight opacity-70 line-clamp-3 break-words w-full`}>{detail}</span>}
      {note && <span className="text-[11px] leading-tight font-semibold text-pink-deep">{note}</span>}
    </>
  )
  if (!onTap) return <div className={`${TILE} ${look}`}>{content}</div>
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={checkable ? selected : undefined}
      className={`${TILE} ${look} w-full hover:bg-coconut/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-moss`}
    >
      {content}
    </button>
  )
}
