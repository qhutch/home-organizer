'use client'

import { openPdf } from '@/lib/documents/pdf'

// Aperçu d'un document, fait dans le navigateur avant l'envoi : une image JPEG de 320 px au plus
// (la première page d'un PDF, ou la photo réduite). Rangé avec le document, aussi protégé que lui.
const THUMB_SIZE = 320

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.75))
}

function fit(width: number, height: number) {
  const scale = Math.min(1, THUMB_SIZE / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale }
}

async function imageThumbnail(file: Blob) {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fit(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvasToJpeg(canvas)
}

async function pdfThumbnail(file: Blob) {
  const pdf = await openPdf(await file.arrayBuffer())
  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const { scale } = fit(base.width, base.height)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const context = canvas.getContext('2d')!
    // Fond blanc : un PDF transparent donnerait un aperçu noir en JPEG
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise
    return canvasToJpeg(canvas)
  } finally {
    void pdf.destroy()
  }
}

// null si on ne sait pas faire d'aperçu pour ce type (ou si le navigateur ne lit pas l'image, ex. HEIC sur Chrome)
export async function makeThumbnail(file: Blob): Promise<Blob | null> {
  try {
    if (file.type === 'application/pdf') return await pdfThumbnail(file)
    if (file.type.startsWith('image/')) return await imageThumbnail(file)
  } catch {
    // Pas d'aperçu : l'icône du type le remplace
  }
  return null
}
