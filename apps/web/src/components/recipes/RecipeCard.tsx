import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { categoryIcon, categoryLabel } from '@/lib/recipes/categories'
import { dishTypesOf } from '@/lib/recipes/dish-types'
import { coverUrl } from '@/lib/recipes/photo'
import Emoji from '@/components/ui/Emoji'
import { emojiFor } from '@/lib/shopping/catalog'
import type { Recipe, RecipeIngredient } from '@/types/database'

// Ingrédients en commun montrés sur une carte (batch cooking)
const SHARED_SHOWN = 4

export function totalMinutes(recipe: Pick<Recipe, 'prepMinutes' | 'cookMinutes'>) {
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
  return total > 0 ? total : null
}

export function formatMinutes(total: number) {
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} h ${m}` : `${h} h`
}

// Note de 1 à 5 en étoiles : pleines jusqu'à la note, vides ensuite.
function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center" title={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Icon key={n} name="star" size={13} className={n <= rating ? 'fill-current' : 'opacity-35'} />
      ))}
      <span className="sr-only">{rating} sur 5</span>
    </span>
  )
}

// Carte d'une recette dans la bibliothèque : en haut la photo principale (ou l'icône de sa
// catégorie), puis catégorie, nom, note et durée totale ; cœur plein si favori.
// Batch cooking : onPick, la carte choisit la recette au lieu de l'ouvrir ; shared, ses ingrédients
// en commun avec la semaine, en emojis sous le nom.
// Compte rendu du batch cooking : done, pastille cochée sur la photo (recette cuisinée) ; action, un bouton en bas de la carte.
export default function RecipeCard({ recipe, onPick, shared, done, action }: {
  recipe: Recipe; onPick?: () => void; shared?: RecipeIngredient[]; done?: boolean; action?: React.ReactNode
}) {
  const total = totalMinutes(recipe)
  // Un plat montre ses types (« Pâtes · Plats mijotés ») plutôt que « Plats »
  const types = dishTypesOf(recipe.dishTypes)
  const type = types[0]
  const category = types.length ? types.map(t => t.label).join(' · ') : categoryLabel(recipe.category)
  const cover = coverUrl(recipe)
  const className = `tile !p-0 h-full flex flex-col overflow-hidden rounded-3xl ${FEATURES.recipes.soft}`

  const content = (
    <>
      <div className="relative aspect-[4/3] bg-rose/35 text-pink-deep flex items-center justify-center">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- photo déjà réduite (notre route ou Unsplash)
          <img src={cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <Icon name={type?.icon ?? categoryIcon(recipe.category)} size={44} className="opacity-70" />
        )}
        {done && (
          <span className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center ${FEATURES.recipes.fill}`} title="Cuisinée">
            <Icon name="check" size={18} />
            <span className="sr-only">Cuisinée</span>
          </span>
        )}
        {recipe.favorite && (
          <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface text-pink-deep flex items-center justify-center" title="Favori">
            <Icon name="heart" size={17} className="fill-current" />
            <span className="sr-only">Favori</span>
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-1.5 p-3.5">
        <span className="eyebrow !text-pink-deep">{category ?? 'Recette'}</span>
        <p className="font-display font-semibold text-base leading-tight line-clamp-3">{recipe.title}</p>
        {shared && shared.length > 0 && (
          <ul className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-ink-muted" aria-label="En commun avec la semaine">
            {shared.slice(0, SHARED_SHOWN).map((ing, i) => (
              <li key={i} className="inline-flex items-center gap-1 min-w-0 first-letter:uppercase">
                <Emoji name={emojiFor(ing.name, null, ing.emoji)} size={18} />
                <span className="truncate">{ing.name}</span>
              </li>
            ))}
            {shared.length > SHARED_SHOWN && <li>+{shared.length - SHARED_SHOWN}</li>}
          </ul>
        )}
        <p className="mt-auto pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {recipe.rating ? <span className="text-pink-deep"><Stars rating={recipe.rating} /></span> : null}
          {total && (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={14} /> {formatMinutes(total)}
            </span>
          )}
        </p>
      </div>
    </>
  )

  if (action) {
    return (
      <div className={className}>
        <Link href={`/recipes/${recipe.id}`} className="flex-1 flex flex-col">{content}</Link>
        <div className="px-3.5 pb-3.5">{action}</div>
      </div>
    )
  }
  if (onPick) return <button type="button" onClick={onPick} className={`${className} w-full text-left`}>{content}</button>
  return <Link href={`/recipes/${recipe.id}`} className={className}>{content}</Link>
}
