import Icon from '@/components/ui/Icon'

// Conseil de Claude pour faire la recette avec le matériel du foyer (« Pas de moule à madeleines : … »),
// sous le matériel de la fiche et du mode cuisine. La recette elle-même n'est pas modifiée.
export default function KitchenTip({ tip, large = false }: { tip: string; large?: boolean }) {
  return (
    <div className={`bg-coconut rounded-2xl flex items-start gap-2 ${large ? 'px-4 py-3 text-lg' : 'px-3 py-2 text-sm'}`}>
      <Icon name="tool" size={large ? 24 : 18} className="shrink-0 mt-0.5" />
      <p className="whitespace-pre-line">
        <span className="font-semibold">Avec notre matériel : </span>{tip}
      </p>
    </div>
  )
}
