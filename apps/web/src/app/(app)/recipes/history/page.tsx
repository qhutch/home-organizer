import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { categoryIcon } from '@/lib/recipes/categories'
import { coverUrl } from '@/lib/recipes/examples'
import { getCookings, getMembers, getRecipes } from '../actions'

const TZ = 'Europe/Paris'
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('fr-CA', { timeZone: TZ })

// « Aujourd'hui », « Hier », « Samedi 7 novembre », « 12 octobre 2025 »
function dayLabel(iso: string) {
  const day = dayKey(iso)
  const today = new Date()
  if (day === dayKey(today.toISOString())) return 'Aujourd’hui'
  if (day === dayKey(new Date(today.getTime() - 86_400_000).toISOString())) return 'Hier'
  const sameYear = new Date(iso).getFullYear() === today.getFullYear()
  const label = new Date(iso).toLocaleDateString('fr-FR', { timeZone: TZ, day: 'numeric', month: 'long', ...(sameYear ? { weekday: 'long' } : { year: 'numeric' }) })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Historique : les recettes cuisinées (« C'est prêt » du mode cuisine), regroupées par jour.
export default async function RecipeHistoryPage() {
  const [cookings, recipes] = await Promise.all([getCookings(), getRecipes()])
  const members = await getMembers(cookings.map(c => c.cookedBy))
  const byId = new Map(recipes.map(r => [r.id, r]))

  const days: { label: string; items: typeof cookings }[] = []
  for (const c of cookings) {
    const label = dayLabel(c.cookedAt)
    if (days.at(-1)?.label === label) days.at(-1)!.items.push(c)
    else days.push({ label, items: [c] })
  }

  return (
    <div className="page-wrap max-w-xl">
      <h1 className="text-3xl mb-5">Historique</h1>
      {!days.length ? (
        <p className="card hairline text-sm text-ink-muted">Rien de cuisiné pour l’instant.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map(day => (
            <section key={day.label}>
              <h2 className="eyebrow mb-2">{day.label}</h2>
              <ul className="flex flex-col gap-2">
                {day.items.map(c => {
                  const recipe = byId.get(c.recipeId)
                  const cover = recipe ? coverUrl(recipe, 200) : null
                  const who = members[c.cookedBy]
                  const content = (
                    <>
                      <span className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden bg-pink-soft text-pink-deep flex items-center justify-center">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element -- photo déjà réduite, servie par notre route
                          <img src={cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <Icon name={categoryIcon(recipe?.category ?? null)} size={28} />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-display font-semibold leading-tight line-clamp-2">{recipe?.title ?? c.recipeTitle}</span>
                        <span className="block text-sm text-ink-muted mt-0.5">
                          {c.people} {c.people > 1 ? 'personnes' : 'personne'}{recipe ? '' : ' · recette supprimée'}
                        </span>
                      </span>
                      {who && (
                        <span title={who.name}>
                          <Avatar name={who.name} url={who.avatarUrl} size={28} />
                          <span className="sr-only">Cuisinée par {who.name}</span>
                        </span>
                      )}
                    </>
                  )
                  const row = 'card hairline !p-2 !pr-4 flex items-center gap-3'
                  return (
                    <li key={c.id}>
                      {recipe ? <Link href={`/recipes/${recipe.id}`} className={`${row} hover:bg-coconut/40 transition-colors`}>{content}</Link> : <div className={row}>{content}</div>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
