import { db } from '@/lib/firebase/admin'

// Retours (Réglages › Retours) : ce que les membres du foyer notent sur l'app pour Claude.
// Claude les lit au début de chaque session (scripts/feedback.mjs, lancé par le hook SessionStart),
// puis les marque traités avec une courte réponse.
export type Feedback = {
  id: string
  text: string
  createdBy: string
  createdAt: number
  status: 'new' | 'done'
  reply: string | null
  doneAt: number | null
}

export async function loadFeedback(householdId: string): Promise<Feedback[]> {
  const snap = await db.collection('households').doc(householdId).collection('feedback')
    .orderBy('createdAt', 'desc').limit(50).get()
  return snap.docs.map(d => {
    const x = d.data()
    return {
      id: d.id,
      text: x.text ?? '',
      createdBy: x.createdBy ?? '',
      createdAt: x.createdAt?.toMillis?.() ?? 0,
      status: x.status === 'done' ? 'done' : 'new',
      reply: x.reply ?? null,
      doneAt: x.doneAt?.toMillis?.() ?? null,
    }
  })
}
