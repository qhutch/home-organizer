'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const displayName = (formData.get('display_name') as string)?.trim() || null

  try {
    await db.collection('userProfiles').doc(user.uid).set({
      displayName,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    revalidatePath('/profile')
    return { success: true }
  } catch {
    return { error: 'Erreur lors de la sauvegarde' }
  }
}
