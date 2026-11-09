import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'
import { categoryLabel } from '@/lib/recipes/categories'
import { RECIPE_LABELS } from '@/lib/recipes/labels'
import { SEASONS } from '@/lib/recipes/seasons'
import RecipeActions from '@/components/recipes/RecipeActions'
import RecipePhotos from '@/components/recipes/RecipePhotos'
import RecipeBar, { OpenReviewButton } from '@/components/recipes/RecipeBar'
import RecipeIngredients from '@/components/recipes/RecipeIngredients'
import PhotoCarousel from '@/components/recipes/PhotoCarousel'
import { getExampleRecipe, isExampleId, photoUrls } from '@/lib/recipes/examples'
import Avatar from '@/components/ui/Avatar'
import { getMembers, getRecipe, getRecipePhotos } from '../actions'

// Cartouche (saison, label) : fond rose doux ; on la touche pour voir les recettes qui l'ont aussi
const tag = 'inline-flex items-center gap-1.5 rounded-full bg-pink-soft text-pink-deep px-3 py-1.5 text-xs font-semibold hover:bg-rose/40 transition-colors'

// Fiche recette : photos, titre, note, cartouches, durées et personnes (qui recalculent les quantités),
// ingrédients, étapes, photos, commentaire ; barre du bas (note, courses, cuisiner).
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Recette d'exemple (pas en base) : même fiche, sans favori, suppression ni photos
  const example = isExampleId(id)
  const [recipe, photos] = example
    ? [getExampleRecipe(id), []]
    : await Promise.all([getRecipe(id), getRecipePhotos(id)])
  if (!recipe) notFound()

  const members = example ? {} : await getMembers([recipe.addedBy, recipe.commentBy])
  const addedBy = example ? null : members[recipe.addedBy] ?? null
  // Les exemples n'ont pas d'auteur : leur commentaire est signé « Hestia »
  const commentBy = example ? { name: 'Hestia', avatarUrl: null } : recipe.commentBy ? members[recipe.commentBy] ?? null : null
  const commentDate = recipe.commentAt
    ? new Date(recipe.commentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })
    : null
  const category = categoryLabel(recipe.category)
  const labels = RECIPE_LABELS.filter(l => recipe.labels.includes(l.id))
  // Les quatre saisons : une seule cartouche « Toute l'année », qui mène à toutes les recettes (sans filtre de saison)
  const allYear = recipe.seasons.length === SEASONS.length
  const seasons = allYear ? [] : SEASONS.filter(s => recipe.seasons.includes(s.id))

  return (
    <div className="page-wrap max-w-xl">

      <PhotoCarousel urls={photoUrls(recipe, photos)} />

      {category && (
        <Link href={`/recipes?category=${recipe.category}`} className="eyebrow mb-1 inline-block hover:text-ink">{category}</Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl leading-tight">{recipe.title}</h1>
        {example ? (
          <span className="shrink-0 mt-2 rounded-full bg-surface hairline px-2.5 py-1 text-xs font-semibold text-ink-muted">Exemple</span>
        ) : (
          <RecipeActions id={recipe.id} favorite={recipe.favorite} />
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted mt-2 mb-4">
        {addedBy && (
          <span title={`Ajoutée par ${addedBy.name}`}>
            <Avatar name={addedBy.name} url={addedBy.avatarUrl} size={28} />
            <span className="sr-only">Ajoutée par {addedBy.name}</span>
          </span>
        )}
        {/* Les étoiles mènent au commentaire, en bas de la fiche */}
        <a href="#commentaire" className="inline-flex items-center text-pink-deep rounded-full -mx-1 px-1 py-1 hover:bg-pink-soft" title="Voir le commentaire">
          {[1, 2, 3, 4, 5].map(n => (
            <Icon key={n} name="star" size={16} className={recipe.rating && n <= recipe.rating ? 'fill-current' : 'opacity-35'} />
          ))}
          <span className="sr-only">{recipe.rating ? `${recipe.rating} sur 5` : 'Pas encore notée'}, voir le commentaire</span>
        </a>
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-ink">
            <Icon name="link" size={16} /> Recette d’origine
          </a>
        )}
      </p>

      {(recipe.seasons.length > 0 || labels.length > 0) && (
        <ul className="flex flex-wrap gap-1.5 mb-4" aria-label="Saisons et labels">
          {allYear && (
            <li><Link href="/recipes?season=all" className={tag}><Icon name="leaf" size={14} /> Toute l’année</Link></li>
          )}
          {seasons.map(s => (
            <li key={s.id}><Link href={`/recipes?season=${s.id}`} className={tag}><Icon name="leaf" size={14} /> {s.label}</Link></li>
          ))}
          {labels.map(l => (
            <li key={l.id}><Link href={`/recipes?label=${l.id}`} className={tag}><Icon name={l.icon} size={14} /> {l.label}</Link></li>
          ))}
        </ul>
      )}

      <RecipeIngredients servings={recipe.servings} prepMinutes={recipe.prepMinutes} cookMinutes={recipe.cookMinutes} ingredients={recipe.ingredients} />

      <section className="card mb-2">
        <h2 className="font-display font-semibold text-lg mb-3">Étapes</h2>
        {recipe.steps.length ? (
          <ol className="flex flex-col gap-3 text-sm">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className={`w-5 shrink-0 font-display font-semibold ${FEATURES.recipes.text}`}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-ink-muted">Pas d’étapes notées.</p>}
      </section>

      {!example && <RecipePhotos recipeId={recipe.id} photos={photos} coverPhotoId={recipe.coverPhotoId} />}

      <section id="commentaire" className="mt-6 mb-2 scroll-mt-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-semibold text-lg">Commentaire</h2>
          <OpenReviewButton label={recipe.comment ? 'Modifier la note et le commentaire' : 'Noter et commenter'} />
        </div>
        {recipe.comment ? (
          <>
            {/* Comme un message : la photo de qui l'a écrit, puis une bulle avec son prénom et la date */}
            <div className="flex items-start gap-3">
              <Avatar name={commentBy?.name ?? null} url={commentBy?.avatarUrl} size={40} />
              <div className="flex-1 min-w-0 bg-surface hairline rounded-3xl rounded-tl-md px-4 py-3">
                <p className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold">{commentBy?.name ?? 'Quelqu’un du foyer'}</span>
                  {commentDate && <span className="text-xs text-ink-muted">{commentDate}</span>}
                </p>
                <p className="text-sm whitespace-pre-line">{recipe.comment}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="card hairline text-sm text-ink-muted">Pas encore de commentaire. Touche + pour noter la recette et dire ce que vous en avez pensé.</p>
        )}
      </section>

      <RecipeBar id={recipe.id} rating={recipe.rating} comment={recipe.comment} example={example} />
    </div>
  )
}
