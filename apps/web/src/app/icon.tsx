import { appIcon } from '@/lib/ui/app-icon'

// Icônes de l'onglet et du manifeste : /icon/192 et /icon/512
export function generateImageMetadata() {
  return [192, 512].map(size => ({ id: String(size), size: { width: size, height: size }, contentType: 'image/png' }))
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  return appIcon(Number(await id))
}
