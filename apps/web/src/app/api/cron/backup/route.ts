import { db } from '@/lib/firebase/admin'
import { backupHousehold } from '@/lib/backup'

// Sauvegarde quotidienne de chaque foyer sur son NAS (lib/backup), lancée par Vercel (vercel.json › crons).
// Avec CRON_SECRET réglé dans Vercel, Vercel l'envoie et on l'exige. Sans, n'importe qui pourrait appeler
// cette adresse : ce n'est pas grave, un foyer déjà sauvegardé depuis moins de 20 h est sauté (une seule lecture).
export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 })

  const results: Record<string, string> = {}
  for (const household of await db.collection('households').listDocuments()) {
    try {
      results[household.id.slice(0, 6)] = await backupHousehold(household.id)
    } catch (e) {
      console.error('Sauvegarde', household.id, e)
      results[household.id.slice(0, 6)] = 'error'
    }
  }
  return Response.json(results)
}
