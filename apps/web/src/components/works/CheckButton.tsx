import Icon from '@/components/ui/Icon'
import { FEATURES, type FeatureId } from '@/lib/ui/features'

// Case ronde à cocher (utilitaire check-btn) : travaux, saisons d'une série…
export default function CheckButton({ done, label, onClick, feature = 'works' }: { done: boolean; label: string; onClick: () => void; feature?: FeatureId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={done}
      className={`check-btn ${done ? 'is-done' : ''} ${FEATURES[feature].text}`}
    >
      <span>
        <Icon name="check" />
      </span>
    </button>
  )
}
