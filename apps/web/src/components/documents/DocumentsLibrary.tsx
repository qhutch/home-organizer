'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ActionBar, { barGroup } from '@/components/ui/ActionBar'
import Icon from '@/components/ui/Icon'
import Sheet from '@/components/ui/Sheet'
import DocumentsAddMenu from '@/components/documents/DocumentsAddMenu'
import DocumentSheet from '@/components/documents/DocumentSheet'
import DocumentScanner from '@/components/documents/DocumentScanner'
import DocumentRow from '@/components/documents/DocumentRow'
import DocumentThumb from '@/components/documents/DocumentThumb'
import DestinationChips, { type Destination } from '@/components/documents/DestinationChips'
import FolderSheet from '@/components/documents/FolderSheet'
import NameSheet from '@/components/documents/NameSheet'
import { useAutoLock } from '@/components/documents/useAutoLock'
import { FEATURES } from '@/lib/ui/features'
import { uploadDocument } from '@/lib/documents/upload'
import {
  createFolder, deleteFolder, lock, moveDocuments, moveFolder, renameDocument, renameFolder, setDocumentPrivate, setFolderPrivate, trashDocuments,
  type Duplicate,
} from '@/app/(app)/documents/actions'
import type { HouseholdDocument } from '@/types/database'

type Member = { name: string; avatarUrl: string | null }
type Upload = { key: string; name: string; progress: number; error: string | null; duplicate: Duplicate | null }
type Crumb = { id: string; name: string; href: string }
type FolderTile = { id: string; name: string; count: number; href: string; private: boolean }
type Privacy = { private: boolean; inherited: boolean; canMakePrivate: boolean }

const feature = FEATURES.documents

function countLabel(count: number) {
  if (count === 0) return 'Vide'
  return count === 1 ? '1 élément' : `${count} éléments`
}

// Pour chercher sans se soucier des accents ni des majuscules
function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

// Un dossier de documents, une fois Face ID fait.
// À la racine : « Récents », les dossiers (et la corbeille), puis les documents.
// Barre du bas : verrou, recherche dans tout, et le + (dossier, scan, fichiers). On peut aussi déposer des fichiers sur la page.
export default function DocumentsLibrary({
  trail, parentId, folders, documents, allDocuments, destinations, recents, trashCount, members, canUpload, lockAfterMinutes,
  herePrivate, privacy, shareLabel, me,
}: {
  trail: Crumb[]
  parentId: string | null
  folders: FolderTile[]
  documents: HouseholdDocument[]
  allDocuments: HouseholdDocument[]
  destinations: Destination[]
  recents: HouseholdDocument[]
  trashCount: number
  members: Record<string, Member>
  canUpload: boolean
  lockAfterMinutes: number
  // Ce dossier est privé (réglé sur lui ou sur un dossier qui le contient)
  herePrivate: boolean
  privacy: Privacy | null
  // « Moi et Quentin » ; null si on est seul dans le foyer
  shareLabel: string | null
  me: string
}) {
  const router = useRouter()
  const { touch, outcome } = useAutoLock(lockAfterMinutes)
  const fileInput = useRef<HTMLInputElement>(null)
  const scanInput = useRef<HTMLInputElement>(null)
  const pendingFiles = useRef(new Map<string, File>())
  const [uploads, setUploads] = useState<Upload[]>([])
  const [sheet, setSheet] = useState<'newFolder' | 'folder' | 'move' | null>(null)
  const [openDocument, setOpenDocument] = useState<string | null>(null)
  const [scanPages, setScanPages] = useState<FileList | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = trail.at(-1) ?? null
  const folderId = current?.id ?? null
  const parentHref = trail.at(-2)?.href ?? '/documents'
  const sheetDocument = documents.find(d => d.id === openDocument) ?? null
  const isRoot = !current

  // --- Envois ---

  function patch(key: string, change: Partial<Upload>) {
    setUploads(list => list.map(u => (u.key === key ? { ...u, ...change } : u)))
  }

  async function send(key: string, force = false) {
    const file = pendingFiles.current.get(key)
    if (!file) return
    patch(key, { error: null, duplicate: null, progress: 0 })
    const res = await uploadDocument(file, folderId, { force, onProgress: progress => patch(key, { progress }) })
    touch()
    if (res.ok) {
      pendingFiles.current.delete(key)
      setUploads(list => list.filter(u => u.key !== key))
    } else if (res.error === 'locked') {
      router.refresh()
    } else if (res.duplicate) {
      patch(key, { duplicate: res.duplicate })
    } else {
      patch(key, { error: res.error })
    }
  }

  async function addFiles(files: File[]) {
    if (!files.length || !canUpload) return
    touch()
    const added = files.map(file => ({ file, key: `${file.name}-${file.size}-${Math.random()}` }))
    for (const { file, key } of added) pendingFiles.current.set(key, file)
    setUploads(list => [...added.map(({ file, key }) => ({ key, name: file.name, progress: 0, error: null, duplicate: null })), ...list])
    // Un à la fois, pour ne pas saturer la connexion d'un téléphone
    for (const { key } of added) await send(key)
    router.refresh()
  }

  function dismissUpload(key: string) {
    pendingFiles.current.delete(key)
    setUploads(list => list.filter(u => u.key !== key))
  }

  // Fichiers déposés depuis le Finder ou l'Explorateur, n'importe où sur la page
  useEffect(() => {
    if (!canUpload) return
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
    function onEnter(e: DragEvent) {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    function onLeave(e: DragEvent) {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    function onOver(e: DragEvent) {
      if (hasFiles(e)) e.preventDefault()
    }
    function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      void addFiles(Array.from(e.dataTransfer?.files ?? []))
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  })

  // --- Dossier ---

  async function removeFolder() {
    if (!current) return
    const err = outcome(await deleteFolder(current.id))
    setSheet(null)
    if (err) setError(err)
    else router.push(parentHref)
  }

  async function relocateFolder(target: string | null) {
    if (!current) return
    setSheet(null)
    const res = await moveFolder(current.id, target)
    const err = outcome(res)
    if (err) setError(err)
    else if (res.ok) router.replace(res.href)
  }

  // --- Choix de plusieurs documents ---

  function toggle(id: string) {
    setSelected(set => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function moveSelection(target: string | null) {
    if (!selected) return
    setSheet(null)
    setError(outcome(await moveDocuments([...selected], target)))
    setSelected(null)
  }

  async function trashSelection() {
    if (!selected?.size) return
    outcome(await trashDocuments([...selected]))
    setSelected(null)
  }

  // --- Recherche (dans tous les dossiers) ---

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = (text: string) => words.every(w => normalize(text).includes(w))
  const foundFolders = words.length ? destinations.filter(d => matches(d.label.split(' › ').at(-1) ?? '')) : []
  const foundDocuments = words.length ? allDocuments.filter(d => matches(d.name)) : []

  const empty = documents.length === 0 && uploads.length === 0 && folders.length === 0
  const showRecents = isRoot && recents.length > 0 && allDocuments.length > documents.length

  return (
    <>
      {current && (
        <div className="mb-4 flex flex-col gap-1">
          {/* Pas de chemin : le titre « Documents » ramène à la racine, la flèche de l'en-tête remonte d'un dossier */}
          <div className="flex items-center gap-1">
            <h2 className="font-display font-semibold text-2xl tracking-tight flex-1 min-w-0 break-words">
              {current.name}
              {herePrivate && <><Icon name="lock" size={20} className="inline ml-2 align-[-0.1em] text-ink-muted" /><span className="sr-only">, privé</span></>}
            </h2>
            <button type="button" onClick={() => setSheet('folder')} className="icon-btn" aria-label="Renommer, déplacer ou supprimer le dossier">
              <Icon name="dots" size={20} />
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mb-4 text-sm text-pink-deep">{error}</p>}

      {words.length > 0 ? (
        <section aria-label="Résultats" className="flex flex-col gap-2">
          {foundFolders.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {foundFolders.map(folder => (
                <li key={folder.id}>
                  <Link href={folder.href} onClick={() => setQuery('')} className={`flex flex-col gap-3 rounded-3xl p-4 h-full hover:brightness-95 transition ${feature.soft}`}>
                    <span className="flex items-start justify-between">
                      <Icon name="folder" size={28} className={feature.text} />
                      {folder.privateTo && <><Icon name="lock" size={18} className="text-ink-muted" /><span className="sr-only">Privé</span></>}
                    </span>
                    <span className="block font-medium break-words">{folder.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {foundDocuments.length > 0 && (
            <ul className="card !p-2 flex flex-col">
              {foundDocuments.map(doc => <DocumentRow key={doc.id} document={doc} detail="place" onOpen={touch} />)}
            </ul>
          )}
          {!foundFolders.length && !foundDocuments.length && (
            <div className="card py-12 text-center"><p className="font-semibold">Rien trouvé</p></div>
          )}
        </section>
      ) : (
        <>
          {showRecents && (
            <section className="mb-5">
              <h2 className="eyebrow mb-2">Récents</h2>
              <ul className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 snap-x">
                {recents.map(doc => (
                  <li key={doc.id} className="snap-start shrink-0 w-28">
                    <Link href={doc.href} onClick={touch} className="flex flex-col gap-1.5 group">
                      <DocumentThumb document={doc} size={112} className="group-hover:brightness-95" />
                      <span className="text-sm font-medium line-clamp-2 break-words">{doc.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(folders.length > 0 || (isRoot && trashCount > 0)) && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {folders.map(folder => (
                <li key={folder.id}>
                  <Link href={folder.href} onClick={touch} className={`flex flex-col gap-3 rounded-3xl p-4 h-full hover:brightness-95 transition ${feature.soft}`}>
                    <span className="flex items-start justify-between">
                      <Icon name="folder" size={28} className={feature.text} />
                      {folder.private && <><Icon name="lock" size={18} className="text-ink-muted" /><span className="sr-only">Privé</span></>}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium break-words">{folder.name}</span>
                      <span className="block text-xs text-ink-muted">{countLabel(folder.count)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {isRoot && trashCount > 0 && (
                <li>
                  <Link href="/documents/corbeille" onClick={touch} className="flex flex-col gap-3 rounded-3xl p-4 h-full border-2 border-dashed border-line hover:bg-coconut transition">
                    <Icon name="trash" size={28} className="text-ink-muted" />
                    <span className="min-w-0">
                      <span className="block font-medium">Corbeille</span>
                      <span className="block text-xs text-ink-muted">{countLabel(trashCount)}</span>
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          )}

          {empty ? (
            <div className="card py-12 flex flex-col items-center gap-2 text-center">
              <p className="font-semibold">{current ? 'Dossier vide' : 'Aucun document'}</p>
            </div>
          ) : (documents.length > 0 || uploads.length > 0) && (
            <section>
              {documents.length > 1 && (
                <div className="flex justify-end mb-1">
                  {selected ? (
                    <button type="button" onClick={() => setSelected(new Set(selected.size === documents.length ? [] : documents.map(d => d.id)))} className="pill text-ink hover:bg-coconut">
                      {selected.size === documents.length ? 'Tout décocher' : 'Tout cocher'}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setSelected(new Set())} className="pill text-ink hover:bg-coconut">Choisir</button>
                  )}
                </div>
              )}
              <ul className="card !p-2 flex flex-col">
                {uploads.map(upload => (
                  <li key={upload.key} className="flex items-center gap-3 p-2.5">
                    <DocumentThumb document={{ id: upload.key, mimeType: '', hasThumb: false }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{upload.name}</p>
                      {upload.duplicate ? (
                        <div className="flex flex-col gap-2 mt-1">
                          <p className="text-xs text-pink-deep">
                            Déjà rangé dans {upload.duplicate.place} : <Link href={upload.duplicate.href} className="underline">{upload.duplicate.name}</Link>
                          </p>
                          <button type="button" onClick={() => send(upload.key, true)} className="btn-outline self-start">Ajouter quand même</button>
                        </div>
                      ) : upload.error ? (
                        <p className="text-xs text-pink-deep">{upload.error}</p>
                      ) : (
                        <div className="mt-1.5 h-1.5 rounded-full bg-coconut overflow-hidden">
                          <div className="h-full bg-moutarde transition-[width]" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
                        </div>
                      )}
                    </div>
                    {(upload.error || upload.duplicate) && (
                      <button type="button" onClick={() => dismissUpload(upload.key)} className="icon-btn" aria-label="Fermer">
                        <Icon name="close" size={20} />
                      </button>
                    )}
                  </li>
                ))}

                {documents.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    member={members[doc.addedBy]}
                    selecting={!!selected}
                    selected={selected?.has(doc.id)}
                    onToggle={() => toggle(doc.id)}
                    onMenu={() => setOpenDocument(doc.id)}
                    onOpen={touch}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Fichiers glissés au-dessus de la page */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-ink/30 p-4 pointer-events-none flex">
          <div className={`flex-1 rounded-[2rem] border-4 border-dashed border-moutarde-deep flex flex-col items-center justify-center gap-3 ${feature.soft}`}>
            <Icon name="upload" size={48} className={feature.text} />
            <p className="font-display font-semibold text-2xl">Déposer dans {current?.name ?? 'Documents'}</p>
          </div>
        </div>
      )}

      <input ref={fileInput} type="file" multiple hidden onChange={e => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      <input ref={scanInput} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => { if (e.target.files?.length) setScanPages(e.target.files); e.target.value = '' }} />

      {selected ? (
        <ActionBar detached>
          <button type="button" onClick={() => setSelected(null)} className="btn-outline btn-lg pointer-events-auto bg-surface">Annuler</button>
          <div className={barGroup}>
            <button type="button" onClick={trashSelection} disabled={!selected.size} className="icon-btn" aria-label="Mettre à la corbeille">
              <Icon name="trash" />
            </button>
            <button type="button" onClick={() => setSheet('move')} disabled={!selected.size} className={`btn-feature btn-lg ${feature.fill}`}>
              <Icon name="folder" />
              {selected.size > 1 ? `Ranger les ${selected.size}` : 'Ranger'}
            </button>
          </div>
        </ActionBar>
      ) : (
        <ActionBar detached>
          {!searching && !query && (
            <div className={barGroup}>
              <button type="button" onClick={() => lock()} className="icon-btn" aria-label="Verrouiller">
                <Icon name="lock" />
              </button>
            </div>
          )}
          <div className={`${barGroup} min-w-0 flex-1`}>
            <span className="pl-3 text-ink-muted"><Icon name="search" size={20} /></span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Chercher"
              aria-label="Chercher un document ou un dossier"
              autoComplete="off"
              enterKeyHint="search"
              onFocus={() => setSearching(true)}
              onBlur={() => setSearching(false)}
              className="flex-1 min-w-0 bg-transparent px-2 py-2 text-base rounded-full focus:outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setQuery('')} className="icon-btn" aria-label="Effacer">
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
          {!searching && !query && (
            <DocumentsAddMenu
              canUpload={canUpload}
              onNewFolder={() => setSheet('newFolder')}
              onScan={() => scanInput.current?.click()}
              onAddFiles={() => fileInput.current?.click()}
            />
          )}
        </ActionBar>
      )}

      {sheet === 'newFolder' && (
        <NameSheet
          title="Nouveau dossier"
          submitLabel="Créer le dossier"
          // Dans un dossier privé, le nouveau l'est aussi : pas de choix
          shareLabel={herePrivate ? null : shareLabel}
          onSubmit={async (name, isPrivate) => outcome(await createFolder(folderId, name, isPrivate))}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'folder' && current && (
        <FolderSheet
          folder={current}
          parentId={parentId}
          destinations={destinations}
          empty={empty}
          privacy={shareLabel && privacy && !privacy.inherited && (privacy.private || privacy.canMakePrivate)
            ? { private: privacy.private, canMakePrivate: privacy.canMakePrivate, shareLabel }
            : null}
          onRename={async name => { setError(outcome(await renameFolder(current.id, name))) }}
          onPrivacy={async isPrivate => { setSheet(null); setError(outcome(await setFolderPrivate(current.id, isPrivate))) }}
          onMove={relocateFolder}
          onDelete={removeFolder}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'move' && selected && (
        <Sheet title={selected.size > 1 ? `Ranger ${selected.size} documents` : 'Ranger le document'} onClose={() => setSheet(null)}>
          <DestinationChips destinations={destinations} current={folderId} onPick={moveSelection} />
        </Sheet>
      )}
      {sheetDocument && (
        <DocumentSheet
          document={sheetDocument}
          destinations={destinations}
          me={me}
          shareLabel={shareLabel}
          onPrivacy={async isPrivate => { setOpenDocument(null); setError(outcome(await setDocumentPrivate(sheetDocument.id, isPrivate))) }}
          onRename={async name => { outcome(await renameDocument(sheetDocument.id, name)) }}
          onMove={async target => { setOpenDocument(null); setError(outcome(await moveDocuments([sheetDocument.id], target))) }}
          onTrash={async () => { setOpenDocument(null); outcome(await trashDocuments([sheetDocument.id])) }}
          onClose={() => setOpenDocument(null)}
        />
      )}
      {scanPages && (
        <DocumentScanner firstPages={scanPages} onSave={file => void addFiles([file])} onClose={() => setScanPages(null)} />
      )}
    </>
  )
}
