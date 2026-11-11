'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { avatarUrl } from '@/lib/avatar'
import type { Artisan, Work, WorkCheck, WorkPaper, WorkStatus } from '@/types/database'
import { documentAccess, isPaperKind } from '@/lib/documents/library'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const STATUSES: WorkStatus[] = ['todo', 'doing', 'done']
const DAY = /^\d{4}-\d{2}-\d{2}$/

async function worksContext() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const household = db.collection('households').doc(membership.householdId)
  return { user, household, collection: household.collection('works') }
}

function readChecks(value: unknown): WorkCheck[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((c): c is { text: string; done?: unknown } => !!c && typeof c.text === 'string')
    .map(c => ({ text: c.text, done: Boolean(c.done) }))
}

function cleanChecks(value: unknown): WorkCheck[] {
  return readChecks(value)
    .map(c => ({ text: c.text.trim().slice(0, 200), done: c.done }))
    .filter(c => c.text)
    .slice(0, 100)
}

function toWork(doc: FirebaseFirestore.DocumentSnapshot): Work {
  const d = doc.data() ?? {}
  const createdAt = d.createdAt?.toDate?.().toISOString() ?? ''
  return {
    id: doc.id,
    title: (d.title as string) ?? '',
    status: STATUSES.includes(d.status) ? d.status : 'todo',
    room: (d.room as string) || null,
    assignees: Array.isArray(d.assignees) ? d.assignees.filter((u: unknown): u is string => typeof u === 'string') : [],
    steps: readChecks(d.steps),
    supplies: readChecks(d.supplies),
    budget: typeof d.budget === 'number' ? d.budget : null,
    notes: (d.notes as string) || null,
    artisanId: (d.artisanId as string) || null,
    interventionDate: typeof d.interventionDate === 'string' && DAY.test(d.interventionDate) ? d.interventionDate : null,
    quote: typeof d.quote === 'number' ? d.quote : null,
    doneAt: d.doneAt?.toDate?.().toISOString() ?? null,
    addedBy: d.addedBy as string,
    createdAt,
    updatedAt: d.updatedAt?.toDate?.().toISOString() ?? createdAt,
  }
}

export async function getWorks(): Promise<Work[]> {
  const { collection } = await worksContext()
  const snapshot = await collection.orderBy('createdAt', 'desc').get()
  return snapshot.docs.map(toWork)
}

export async function getWork(id: string): Promise<Work | null> {
  const { collection } = await worksContext()
  const doc = await collection.doc(id).get()
  return doc.exists ? toWork(doc) : null
}

export type WorkMember = { uid: string; name: string; avatarUrl: string | null }

// Tous les membres du foyer, pour choisir qui s'occupe d'un travail
export async function getWorkMembers(): Promise<WorkMember[]> {
  const { household } = await worksContext()
  const members = await household.collection('members').get()
  const profiles = await Promise.all(members.docs.map(m => db.collection('userProfiles').doc(m.id).get()))
  return members.docs
    .map((m, i) => {
      const p = profiles[i].data() ?? {}
      return { uid: m.id, name: (p.displayName as string) || 'Quelqu’un du foyer', avatarUrl: avatarUrl(m.id, p.avatarVersion as number | undefined) }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function memberIds(household: FirebaseFirestore.DocumentReference) {
  const members = await household.collection('members').get()
  return new Set(members.docs.map(m => m.id))
}

// Nouveau travail, noté dans la barre du bas ; assignees = le membre choisi dans le filtre, s'il y en a un
export async function createWork(title: string, assignees: string[] = []): Promise<string | null> {
  const { user, household, collection } = await worksContext()
  const clean = title.trim().slice(0, 120)
  if (!clean) return null
  const ids = await memberIds(household)
  const ref = await collection.add({
    title: clean,
    status: 'todo',
    room: null,
    assignees: [...new Set(assignees)].filter(uid => ids.has(uid)),
    steps: [],
    supplies: [],
    budget: null,
    notes: null,
    artisanId: null,
    interventionDate: null,
    quote: null,
    doneAt: null,
    addedBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  revalidatePath('/works')
  return ref.id
}

export type WorkPatch = Partial<Pick<Work, 'title' | 'status' | 'room' | 'assignees' | 'steps' | 'supplies' | 'budget' | 'notes' | 'artisanId' | 'interventionDate' | 'quote'>>

function cleanAmount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null
}

// Enregistre ce qui a changé sur un travail (la fiche enregistre au fur et à mesure).
export async function updateWork(id: string, patch: WorkPatch) {
  const { household, collection } = await worksContext()
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

  if (patch.title !== undefined) {
    const title = patch.title.trim().slice(0, 120)
    if (title) update.title = title
  }
  if (patch.status !== undefined && STATUSES.includes(patch.status)) {
    update.status = patch.status
    update.doneAt = patch.status === 'done' ? FieldValue.serverTimestamp() : null
  }
  if (patch.room !== undefined) update.room = patch.room?.trim().slice(0, 60) || null
  if (patch.assignees !== undefined) {
    const ids = await memberIds(household)
    update.assignees = [...new Set(patch.assignees)].filter(uid => ids.has(uid))
  }
  if (patch.steps !== undefined) update.steps = cleanChecks(patch.steps)
  if (patch.supplies !== undefined) update.supplies = cleanChecks(patch.supplies)
  if (patch.budget !== undefined) update.budget = cleanAmount(patch.budget)
  if (patch.quote !== undefined) update.quote = cleanAmount(patch.quote)
  if (patch.interventionDate !== undefined) {
    update.interventionDate = typeof patch.interventionDate === 'string' && DAY.test(patch.interventionDate) ? patch.interventionDate : null
  }
  if (patch.artisanId !== undefined) {
    const exists = patch.artisanId && (await household.collection('artisans').doc(patch.artisanId).get()).exists
    update.artisanId = exists ? patch.artisanId : null
  }
  if (patch.notes !== undefined) update.notes = patch.notes?.trim().slice(0, 4000) || null

  await collection.doc(id).update(update)
  revalidatePath('/works')
  revalidatePath(`/works/${id}`)
}

// Ses devis et factures restent dans Documents, simplement plus reliés à ce travail
export async function deleteWork(id: string) {
  const { household, collection } = await worksContext()
  const papers = await household.collection('documents').where('workId', '==', id).get()
  const batch = db.batch()
  papers.docs.forEach(doc => batch.update(doc.ref, { workId: null }))
  batch.delete(collection.doc(id))
  await batch.commit()
  revalidatePath('/works')
}

// ——— Artisans ———

function toArtisan(doc: FirebaseFirestore.DocumentSnapshot): Artisan {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    name: (d.name as string) ?? '',
    trade: (d.trade as string) || null,
    phone: (d.phone as string) || null,
    email: (d.email as string) || null,
    notes: (d.notes as string) || null,
    addedBy: d.addedBy as string,
    createdAt: d.createdAt?.toDate?.().toISOString() ?? '',
  }
}

export async function getArtisans(): Promise<Artisan[]> {
  const { household } = await worksContext()
  const snapshot = await household.collection('artisans').get()
  return snapshot.docs.map(toArtisan).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export async function getArtisan(id: string): Promise<Artisan | null> {
  const { household } = await worksContext()
  const doc = await household.collection('artisans').doc(id).get()
  return doc.exists ? toArtisan(doc) : null
}

// Nouvel artisan ; workId = le travail depuis lequel on l'a ajouté, qui lui est relié tout de suite
export async function createArtisan(name: string, workId?: string): Promise<string | null> {
  const { user, household, collection } = await worksContext()
  const clean = name.trim().slice(0, 80)
  if (!clean) return null
  const ref = await household.collection('artisans').add({
    name: clean,
    trade: null,
    phone: null,
    email: null,
    notes: null,
    addedBy: user.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  if (workId) {
    const work = collection.doc(workId)
    if ((await work.get()).exists) await work.update({ artisanId: ref.id, updatedAt: FieldValue.serverTimestamp() })
    revalidatePath(`/works/${workId}`)
  }
  revalidatePath('/works/artisans')
  return ref.id
}

export type ArtisanPatch = Partial<Pick<Artisan, 'name' | 'trade' | 'phone' | 'email' | 'notes'>>

export async function updateArtisan(id: string, patch: ArtisanPatch) {
  const { household } = await worksContext()
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    const name = patch.name.trim().slice(0, 80)
    if (name) update.name = name
  }
  if (patch.trade !== undefined) update.trade = patch.trade?.trim().slice(0, 60) || null
  if (patch.phone !== undefined) update.phone = patch.phone?.trim().slice(0, 30) || null
  if (patch.email !== undefined) update.email = patch.email?.trim().slice(0, 120) || null
  if (patch.notes !== undefined) update.notes = patch.notes?.trim().slice(0, 4000) || null
  if (!Object.keys(update).length) return
  await household.collection('artisans').doc(id).update(update)
  revalidatePath('/works')
  revalidatePath('/works/artisans')
  revalidatePath(`/works/artisans/${id}`)
}

// Supprime l'artisan ; les travaux où il intervenait n'ont plus d'artisan (le reste est gardé)
export async function deleteArtisan(id: string) {
  const { household, collection } = await worksContext()
  const [linked, papers] = await Promise.all([
    collection.where('artisanId', '==', id).get(),
    household.collection('documents').where('artisanId', '==', id).get(),
  ])
  const batch = db.batch()
  // Ses travaux et ses devis et factures sont gardés, simplement plus reliés à lui
  for (const doc of [...linked.docs, ...papers.docs]) batch.update(doc.ref, { artisanId: null })
  batch.delete(household.collection('artisans').doc(id))
  await batch.commit()
  revalidatePath('/works')
  revalidatePath('/works/artisans')
}

// ——— Devis et factures (rangés dans Documents, lisibles ici sans Face ID) ———

// Ceux d'un travail, ou d'un artisan (les siens et ceux des travaux où il intervient), le plus récent d'abord
export async function getPapers(filter: { workId: string } | { artisanId: string }): Promise<WorkPaper[]> {
  const { user, household, collection } = await worksContext()
  const canSee = await documentAccess(household.id, user.uid)
  const docs = household.collection('documents')
  let snaps: FirebaseFirestore.QueryDocumentSnapshot[]
  if ('workId' in filter) {
    snaps = (await docs.where('workId', '==', filter.workId).get()).docs
  } else {
    const workIds = (await collection.where('artisanId', '==', filter.artisanId).get()).docs.map(d => d.id)
    const [own, ...byWork] = await Promise.all([
      docs.where('artisanId', '==', filter.artisanId).get(),
      ...chunks(workIds, 30).map(ids => docs.where('workId', 'in', ids).get()),
    ])
    const seen = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    for (const d of [own, ...byWork].flatMap(q => q.docs)) seen.set(d.id, d)
    snaps = [...seen.values()]
  }
  return snaps
    // Sans ceux qu'un autre membre a rendus privés
    .filter(d => d.data().status === 'ready' && isPaperKind(d.data().paperKind) && canSee(d.data()))
    .map(d => {
      const x = d.data()
      return {
        id: d.id,
        name: x.name as string,
        kind: x.paperKind,
        mimeType: x.mimeType as string,
        size: x.size as number,
        hasThumb: Boolean(x.hasThumb),
        workId: (x.workId as string | null) ?? null,
        artisanId: (x.artisanId as string | null) ?? null,
        addedBy: x.addedBy as string,
        createdAt: x.createdAt?.toDate?.().toISOString() ?? '',
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
