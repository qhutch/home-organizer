import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { categoryLabel } from '@/lib/recipes/categories'
import { photoUrl } from '@/lib/recipes/photo'
import type { Recipe } from '@/types/database'

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

// Carte d'une recette dans la bibliothèque : photo principale, catégorie, nom, note et durée totale.
export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const total = totalMinutes(recipe)
  const category = categoryLabel(recipe.category)
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={`tile !p-4 min-h-36 h-full flex flex-col justify-between gap-3 rounded-3xl ${FEATURES.recipes.soft}`}
    >
      {recipe.coverPhotoId && (
        // eslint-disable-next-line @next/next/no-img-element -- photo servie par notre route, déjà réduite
        <img src={photoUrl(recipe.id, recipe.coverPhotoId)} alt="" loading="lazy" className="-mx-4 -mt-4 mb-0 w-[calc(100%+2rem)] max-w-none aspect-[4/3] object-cover rounded-t-3xl bg-coconut" />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow !text-pink-deep">{category ?? 'Recette'}</span>
        {recipe.favorite && (
          <span className="text-pink-deep" title="Favori">
            <Icon name="heart" size={18} className="fill-current" />
            <span className="sr-only">Favori</span>
          </span>
        )}
      </div>
      <p className="font-display font-semibold text-lg leading-tight line-clamp-3">{recipe.title}</p>
      <p className="flex items-center gap-3 text-xs text-ink-muted">
        {recipe.rating && (
          <span className="inline-flex items-center gap-1">
            <Icon name="star" size={14} /> {recipe.rating}
            <span className="sr-only">sur 5</span>
          </span>
        )}
        {total && (
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={14} /> {formatMinutes(total)}
          </span>
        )}
      </p>
    </Link>
  )
}
