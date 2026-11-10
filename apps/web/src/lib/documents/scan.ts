'use client'

import { PDFDocument } from 'pdf-lib'

// Un scan : des photos prises avec le téléphone, remises droites, éclaircies si on veut,
// puis réunies en un seul PDF (une page par photo).
export type ScanPage = { id: string; file: File; url: string; rotation: 0 | 90 | 180 | 270 }
export type ScanLook = 'color' | 'document'

const MAX_SIDE = 2000

// Gris contrasté, comme une photocopie : le fond devient blanc, le texte bien noir
function documentLook(context: CanvasRenderingContext2D, width: number, height: number) {
  const image = context.getImageData(0, 0, width, height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const value = Math.max(0, Math.min(255, (gray - 128) * 1.6 + 150))
    data[i] = data[i + 1] = data[i + 2] = value
  }
  context.putImageData(image, 0, 0)
}

async function pageJpeg(page: ScanPage, look: ScanLook) {
  const bitmap = await createImageBitmap(page.file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const sideways = page.rotation === 90 || page.rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = sideways ? h : w
  canvas.height = sideways ? w : h
  const context = canvas.getContext('2d', { willReadFrequently: look === 'document' })!
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((page.rotation * Math.PI) / 180)
  context.drawImage(bitmap, -w / 2, -h / 2, w, h)
  context.setTransform(1, 0, 0, 1, 0, 0)
  bitmap.close()
  if (look === 'document') documentLook(context, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) throw new Error('Photo illisible')
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height }
}

// Le PDF du scan ; chaque page garde la forme de sa photo, à la largeur d'une feuille A4
export async function buildScanPdf(pages: ScanPage[], look: ScanLook, name: string) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(name)
  for (const page of pages) {
    const { bytes, width, height } = await pageJpeg(page, look)
    const image = await pdf.embedJpg(bytes)
    const pageWidth = 595
    const pageHeight = (pageWidth * height) / width
    pdf.addPage([pageWidth, pageHeight]).drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight })
  }
  const bytes = await pdf.save()
  const fileName = name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`
  return new File([bytes as BlobPart], fileName, { type: 'application/pdf' })
}
