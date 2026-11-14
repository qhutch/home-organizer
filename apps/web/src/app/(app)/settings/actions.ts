'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { listAlbums, NasError } from '@/lib/photos/synology'
import { getNasSharing, removeNasConnection, saveNasConnection, saveNasSharing } from '@/lib/storage/nas'

export async function removeMember(memberId: string, householdId: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'Non connecté' }

  const membership = await getUserHousehold(user.uid)
  if (!membership || membership.role !== 'owner') return { error: 'Accès refusé' }
  if (memberId === user.uid) return { error: 'Tu ne peux pas te retirer toi-même' }

  const batch = db.batch()
  batch.delete(db.collection('households').doc(householdId).collection('members').doc(memberId))
  batch.delete(db.collection('userHouseholds').doc(memberId))
  await batch.commit()

  revalidatePath('/settings')
  return { success: true }
}

export async function generateInviteLink(householdId: string): Promise<string | null> {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const crypto = await import('crypto')
  const token = crypto.randomBytes(16).toString('hex')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await db
    .collection('invites')
    .doc(token)
    .set({
      householdId,
      createdBy: user.uid,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    })

  return token
}
// Ma photo de profil (déjà réduite dans le navigateur), dans userAvatars/{uid}.
// avatarVersion change à chaque photo : l'adresse de l'image change, le cache ne garde pas l'ancienne.
export async function setAvatar(photo: Blob): Promise<{ error?: string }> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (photo.type !== 'image/jpeg' || photo.size > 300_000) return { error: 'Photo trop lourde.' }
  await db.collection('userAvatars').doc(user.uid).set({ data: Buffer.from(await photo.arrayBuffer()), updatedAt: new Date().toISOString() })
  await db.collection('userProfiles').doc(user.uid).set({ avatarVersion: Date.now(), updatedAt: new Date().toISOString() }, { merge: true })
  revalidatePath('/', 'layout')
  return {}
}

export async function removeAvatar() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  await db.collection('userAvatars').doc(user.uid).delete()
  await db.collection('userProfiles').doc(user.uid).set({ avatarVersion: null, updatedAt: new Date().toISOString() }, { merge: true })
  revalidatePath('/', 'layout')
}

export async function updateProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const displayName = (formData.get('display_name') as string)?.trim() || null

  try {
    await db.collection('userProfiles').doc(user.uid).set({
      displayName,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Erreur lors de la sauvegarde' }
  }
}

// --- NAS du foyer (Photos et Documents), réglé par foyer ---

// Adresse du tunnel : https obligatoire, sans chemin ni barre finale
function tunnelUrl(raw: string): string | null {
  const value = raw.trim().replace(/\/+$/, '')
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username) return null
    return url.origin
  } catch {
    return null
  }
}

// Vérifie que le NAS répond avec ces identifiants avant de les ranger (chiffrés) pour le foyer.
// `force` : les garder même si le NAS ne répond pas (tunnel pas encore joignable, NAS éteint…).
export async function connectNas(formData: FormData, force = false): Promise<{ error?: string }> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const url = tunnelUrl(String(formData.get('url') ?? ''))
  const account = String(formData.get('account') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const gatekeeperKey = String(formData.get('gatekeeperKey') ?? '').trim()
  if (!url) return { error: 'Adresse du NAS invalide (https://…).' }
  if (!account || !password || !gatekeeperKey) return { error: 'Tous les champs sont nécessaires.' }

  const connection = { provider: 'synology' as const, url, account, password, gatekeeperKey }
  if (!force) {
    try {
      await listAlbums(connection)
    } catch (e) {
      return { error: e instanceof NasError ? e.message : 'Le NAS ne répond pas.' }
    }
  }
  await saveNasConnection(membership.householdId, user.uid, connection)
  revalidatePath('/settings')
  revalidatePath('/photos', 'layout')
  revalidatePath('/documents', 'layout')
  revalidatePath('/works', 'layout')
  return {}
}

export async function disconnectNas() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  await removeNasConnection(membership.householdId)
  revalidatePath('/settings')
  revalidatePath('/photos', 'layout')
  revalidatePath('/documents', 'layout')
  revalidatePath('/works', 'layout')
}

// Réglages › Retours : une remarque sur l'app, que Claude lira au début de la prochaine session
export async function sendFeedback(text: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'Non connecté' }
  const membership = await getUserHousehold(user.uid)
  if (!membership) return { error: 'Aucun foyer' }
  const clean = text.trim().slice(0, 4000)
  if (!clean) return { error: 'Retour vide' }

  await db.collection('households').doc(membership.householdId).collection('feedback').add({
    text: clean,
    createdBy: user.uid,
    createdAt: new Date(),
    status: 'new',
  })
  revalidatePath('/settings')
  return { success: true }
}

// On ne retire qu'un retour pas encore traité
export async function deleteFeedback(id: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'Non connecté' }
  const membership = await getUserHousehold(user.uid)
  if (!membership) return { error: 'Aucun foyer' }

  const ref = db.collection('households').doc(membership.householdId).collection('feedback').doc(id)
  const doc = await ref.get()
  if (!doc.exists || doc.data()?.status === 'done') return { error: 'Introuvable' }
  await ref.delete()
  revalidatePath('/settings')
  return { success: true }
}

// Compte Synology d'un membre du foyer (pour partager avec lui les albums créés dans Hestia) ; null = aucun
export async function setMemberNasAccount(memberId: string, accountId: number | null) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  const member = await db.collection('households').doc(membership.householdId).collection('members').doc(memberId).get()
  if (!member.exists) return
  const { memberAccounts } = await getNasSharing(membership.householdId)
  // null = « Aucun » choisi exprès : Hestia ne le reliera plus tout seul
  const next = { ...memberAccounts, [memberId]: accountId !== null && Number.isInteger(accountId) ? accountId : null }
  await saveNasSharing(membership.householdId, { memberAccounts: next })
  revalidatePath('/settings')
}

// Groupe du NAS proposé sous le nom « Famille » à la création d'un album ; null = aucun
export async function setFamilyGroup(groupId: number | null) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')
  await saveNasSharing(membership.householdId, { familyGroupId: groupId !== null && Number.isInteger(groupId) ? groupId : null })
  revalidatePath('/settings')
  revalidatePath('/photos', 'layout')
}
