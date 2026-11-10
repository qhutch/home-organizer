'use client'

// pdf.js (Mozilla), chargé seulement quand on en a besoin : aperçu d'un PDF, lecture dans Hestia.
// Le travail lourd se fait dans un « worker » (un fil à part), pour ne pas figer la page.
export async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  }
  return pdfjs
}

export async function openPdf(data: ArrayBuffer | string) {
  const pdfjs = await loadPdfjs()
  return pdfjs.getDocument(typeof data === 'string' ? { url: data } : { data }).promise
}
