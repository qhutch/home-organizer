import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { NasDown, NoNas } from '@/components/photos/PhotosStates'
import NewAlbum from '@/components/photos/NewAlbum'
import { db } from '@/lib/firebase/admin'
import { avatarUrl } from '@/lib/avatar'
import { photosContext, thumbUrl } from '@/lib/photos/load'
import { listAlbums, listItems, listShareTargets, NasError, type Album, type PhotoItem } from '@/lib/photos/synology'
import { resolveNasSharing } from '@/lib/photos/sharing'

// Filtres de l'onglet (?filtre=…) : créés par moi (dans Hestia, ou avec mon compte Synology), partagés directement avec le compte Hestia,
// partagés avec le groupe Famille (réglé dans Réglages › Albums partagés)
const FILTERS = [
  { id: null, label: 'Tous' },
  { id: 'moi', label: 'Créés par moi' },
  { id: 'hestia', label: 'Partagés avec Hestia' },
  { id: 'famille', label: 'Partagés avec Famille' },
] as const
type FilterId = 'moi' | 'hestia' | 'famille'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' })

const chipClass = (active: boolean) => `chip shrink-0 inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`

// Les albums du NAS du foyer : ceux créés dans Hestia (par le compte Hestia du NAS) et ceux partagés avec lui
export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { uid, connection, householdId } = await photosContext()
  const { filtre } = await searchParams

  if (!connection) {
    return (
      <div className="page-wrap">
        <PageHeader feature="photos" />
        <NoNas />
      </div>
    )
  }

  let albums: Album[]
  try {
    albums = await listAlbums(connection)
  } catch (e) {
    return (
      <div className="page-wrap">
        <PageHeader feature="photos" />
        <NasDown message={e instanceof NasError ? e.message : 'Le NAS ne répond pas.'} />
      </div>
    )
  }

  const household = db.collection('households').doc(householdId)
  const [sharing, created, membersSnap] = await Promise.all([
    resolveNasSharing(householdId, connection),
    household.collection('photoAlbums').get(),
    household.collection('members').get(),
  ])
  // Mon compte Synology (Réglages › Albums partagés) : mes albums créés directement dans Synology Photos sont aussi « à moi »
  const myAccount = sharing.memberAccounts[uid]
  const familyGroupId = sharing.familyGroupId ?? null
  const myAccountName = typeof myAccount !== 'number' ? null
    : (await listShareTargets(connection).catch(() => [])).find(a => a.type === 'user' && a.id === myAccount)?.name ?? null
  // Qui a créé chaque album dans Hestia (id de l'album sur le NAS → uid)
  const creators = new Map(created.docs.map(d => [Number(d.id), d.data().createdBy as string]))
  const profiles = await Promise.all(membersSnap.docs.map(d => db.collection('userProfiles').doc(d.id).get()))
  const people = new Map(membersSnap.docs.map((d, i) => [d.id, {
    name: (profiles[i].data()?.displayName as string | undefined) ?? null,
    avatar: avatarUrl(d.id, profiles[i].data()?.avatarVersion),
  }]))

  const filter = FILTERS.some(f => f.id === filtre) ? filtre as FilterId : null
  const matches = (album: Album) => {
    if (filter === 'moi') return album.sharedWithMe ? album.owner !== null && album.owner === myAccountName : creators.get(album.id) === uid
    if (filter === 'hestia') return album.sharedWithMe && album.sharedWithHestia
    if (filter === 'famille') return familyGroupId !== null && album.groups.includes(familyGroupId)
    return true
  }
  const shown = albums.filter(matches)
  const filters = FILTERS.filter(f => f.id !== 'famille' || familyGroupId !== null)

  // Couverture : la première photo de chaque album
  const covers = await Promise.all(
    shown.map(album => listItems(connection, album.ref, 0, 5).then(items => items[0] ?? null).catch((): PhotoItem | null => null))
  )

  return (
    <div className="page-wrap pb-28">
      <PageHeader feature="photos" />
      <nav className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-4" aria-label="Filtres">
        {filters.map(f => (
          <Link
            key={f.id ?? 'tous'}
            href={f.id ? `/photos?filtre=${f.id}` : '/photos'}
            className={chipClass(filter === f.id)}
            aria-current={filter === f.id ? 'page' : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="font-semibold">Aucun album</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {shown.map((album, i) => {
            const creator = !album.sharedWithMe ? people.get(creators.get(album.id) ?? '') : undefined
            return (
              <li key={album.ref}>
                <Link href={`/photos/${album.ref}`} className="flex flex-col gap-1.5">
                  <span className="relative block aspect-square rounded-3xl overflow-hidden bg-prune-soft text-prune-deep">
                    {covers[i]?.previews.includes('m') ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniature servie par notre route
                      <img src={thumbUrl(album.ref, covers[i]!, 'm')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center"><Icon name="photos" size={40} /></span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium leading-tight truncate">{album.name}</span>
                      <span className="text-xs text-ink-muted truncate">
                        {album.owner && `${album.owner} · `}{album.count} {album.count > 1 ? 'photos' : 'photo'}
                      </span>
                      {album.created > 0 && (
                        <span className="text-xs text-ink-muted truncate">Créé le {dateFormat.format(new Date(album.created * 1000))}</span>
                      )}
                    </span>
                    {creator && <Avatar name={creator.name} url={creator.avatar} size={28} />}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <NewAlbum canShareWithFamily={familyGroupId !== null} />
    </div>
  )
}
