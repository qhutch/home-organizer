import Icon from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'

// Case ronde à cocher des travaux (utilitaire check-btn)
export default function CheckButton({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={done}
      className={`check-btn ${done ? 'is-done' : ''} ${FEATURES.works.text}`}
    >
      <span>
        <Icon name="check" />
      </span>
    </button>
  )
}
