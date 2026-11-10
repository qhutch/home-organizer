import DocumentsView from '@/components/documents/DocumentsView'

// Un dossier : /documents/{id}/{id}… (chaque dossier dans le précédent)
export default async function DocumentFolderPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return <DocumentsView path={path} />
}
