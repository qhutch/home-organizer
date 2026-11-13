import { notFound, redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import DocumentsLock from '@/components/documents/DocumentsLock'
import DocumentsLibrary from '@/components/documents/DocumentsLibrary'
import DocumentViewer from '@/components/documents/DocumentViewer'
import TrashView from '@/components/documents/TrashView'
import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { avatarUrl } from '@/lib/avatar'
import { passkeysOf } from '@/lib/documents/passkeys'
import { UNLOCK_MINUTES, documentsUnlocked } from '@/lib/documents/unlock'
import { documentStorage } from '@/lib/documents/storage'
import { loadLibrary, resolveTrail } from '@/lib/documents/library'
import { purgeOldTrash, trashDaysLeft } from '@/lib/documents/trash'

async function memberInfo(uids: string[]) {
  const ids = [...new Set(uids)]
  const profiles = await Promise.all(ids.map(uid => db.collection('userProfiles').doc(uid).get()))
  return Object.fromEntries(ids.map((uid, i) => {
    const d = profiles[i].data() ?? {}
    return [uid, { name: (d.displayName as string) || 'Quelqu’un du foyer', avatarUrl: avatarUrl(uid, d.avatarVersion as number | undefined) }]
  }))
}

// L'onglet Documents, verrouillé tant que le membre n'a pas fait Face ID.
// path : ids depuis la racine ([] = la racine). Si le dernier est un document du dossier précédent, on l'ouvre.
// trash : la corbeille.
export default async function DocumentsView({ path = [], trash = false }: { path?: string[]; trash?: boolean }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  const householdId = membership.householdId

  if (!(await documentsUnlocked(user.uid))) {
    const hasPasskey = (await passkeysOf(user.uid)).length > 0
    return (
      <div className="page-wrap">
        <PageHeader feature="documents" />
        <DocumentsLock email={user.email ?? ''} hasPasskey={hasPasskey} />
      </div>
    )
  }

  const library = await loadLibrary(householdId, user.uid)
  const purged = await purgeOldTrash(householdId, library.trash)
  const trashed = library.trash.filter(d => !purged.includes(d.id))

  if (trash) {
    return (
      <div className="page-wrap">
        <PageHeader feature="documents" />
        <TrashView documents={trashed} daysLeft={Object.fromEntries(trashed.map(d => [d.id, trashDaysLeft(d.trashedAt)]))} lockAfterMinutes={UNLOCK_MINUTES} />
      </div>
    )
  }

  // « Moi et Quentin » : qui d'autre est dans le foyer (seul : pas de choix privé ou partagé)
  const others = (await db.collection('households').doc(householdId).collection('members').get()).docs
    .map(d => d.id)
    .filter(id => id !== user.uid)
  const otherInfo = await memberInfo(others)
  const shareLabel = others.length === 0 ? null : others.length === 1 ? `Moi et ${otherInfo[others[0]].name}` : 'Tout le foyer'

  // Un document ouvert : /documents/{dossiers…}/{document}
  let trail = resolveTrail(library.folders, path)
  if (!trail && path.length) {
    const folderTrail = resolveTrail(library.folders, path.slice(0, -1))
    const document = folderTrail && library.documents.find(d => d.id === path.at(-1) && d.folderId === (folderTrail.at(-1)?.id ?? null))
    if (!folderTrail || !document) notFound()
    await db.collection('households').doc(householdId).collection('documents').doc(document.id).update({ lastOpenedAt: new Date() })
    const members = await memberInfo([document.addedBy])
    return (
      <div className="page-wrap">
        <PageHeader feature="documents" />
        <DocumentViewer
          document={document}
          member={members[document.addedBy]}
          destinations={library.paths}
          folderHref={`/documents${path.slice(0, -1).map(id => `/${id}`).join('')}`}
          me={user.uid}
          shareLabel={shareLabel}
          lockAfterMinutes={UNLOCK_MINUTES}
        />
      </div>
    )
  }
  if (!trail) notFound()
  trail = trail ?? []

  const here = trail.at(-1) ?? null
  const folderId = here?.id ?? null

  const privacy = here ? {
    private: here.privateTo === user.uid,
    // Rangé dans un dossier privé : il l'est aussi, sans réglage à lui
    inherited: Boolean(here.parentId && library.allPathById.get(here.parentId)?.privateTo),
    canMakePrivate: !here.createdBy || here.createdBy === user.uid,
  } : null
  const documents = library.documents.filter(d => d.folderId === folderId)
  const subfolders = library.folders.filter(f => f.parentId === folderId)
  const count = (id: string) =>
    library.folders.filter(c => c.parentId === id).length + library.documents.filter(d => d.folderId === id).length

  // Récents : derniers ouverts ou ajoutés, tous dossiers confondus
  const recents = [...library.documents]
    .sort((a, b) => (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt))
    .slice(0, 8)

  return (
    <div className="page-wrap">
      <PageHeader feature="documents" />
      <DocumentsLibrary
        // Remis à zéro en changeant de dossier
        key={folderId ?? 'root'}
        trail={trail.map((f, i) => ({ id: f.id, name: f.name, href: `/documents/${path.slice(0, i + 1).join('/')}` }))}
        parentId={trail.at(-2)?.id ?? null}
        folders={subfolders.map(f => ({ id: f.id, name: f.name, count: count(f.id), href: `/documents/${[...path, f.id].join('/')}`, private: Boolean(f.privateTo) }))}
        herePrivate={Boolean(here && library.allPathById.get(here.id)?.privateTo)}
        privacy={privacy}
        shareLabel={shareLabel}
        me={user.uid}
        documents={documents}
        allDocuments={library.documents}
        destinations={library.paths}
        recents={recents}
        trashCount={trashed.length}
        members={await memberInfo(documents.map(d => d.addedBy))}
        canUpload={!!(await documentStorage(householdId))}
        lockAfterMinutes={UNLOCK_MINUTES}
      />
    </div>
  )
}
