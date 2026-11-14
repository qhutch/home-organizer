import { db } from '@/lib/firebase/admin'
import { getNasSharing, saveNasSharing, type NasConnection, type NasSharing } from '@/lib/storage/nas'
import { listShareTargets } from './synology'

// À qui partager les albums créés dans Hestia. Ce qui n'est pas encore relié l'est tout seul :
// un compte du NAS qui porte le prénom d'un membre, un groupe qui s'appelle « famille ».
// Réglages › Albums partagés ne sert qu'à corriger (« Aucun » y reste un vrai choix).

const same = (a: string, b: string) =>
  a.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase() ===
  b.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export async function resolveNasSharing(householdId: string, connection: NasConnection): Promise<NasSharing> {
  const sharing = await getNasSharing(householdId)
  const members = (await db.collection('households').doc(householdId).collection('members').get()).docs.map(d => d.id)
  const missing = members.filter(uid => !(uid in sharing.memberAccounts))
  if (!missing.length && sharing.familyGroupId !== undefined) return sharing

  const targets = await listShareTargets(connection).catch(() => null)
  if (!targets) return sharing
  const profiles = await Promise.all(missing.map(uid => db.collection('userProfiles').doc(uid).get()))
  const found: Record<string, number> = {}
  missing.forEach((uid, i) => {
    const name = profiles[i].data()?.displayName as string | undefined
    const account = name ? targets.find(t => t.type === 'user' && same(t.name, name)) : undefined
    if (account) found[uid] = account.id
  })
  const family = sharing.familyGroupId === undefined
    ? targets.find(t => t.type === 'group' && same(t.name, 'famille'))?.id
    : undefined

  const update: Partial<NasSharing> = {}
  if (Object.keys(found).length) update.memberAccounts = { ...sharing.memberAccounts, ...found }
  if (family !== undefined) update.familyGroupId = family
  if (Object.keys(update).length) await saveNasSharing(householdId, update)
  return { ...sharing, ...update }
}

// Les comptes Synology des membres (sans les « Aucun »)
export const memberAccountIds = (sharing: NasSharing) =>
  [...new Set(Object.values(sharing.memberAccounts).filter((id): id is number => typeof id === 'number'))]
