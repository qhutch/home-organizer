'use client'

import Icon from '@/components/ui/Icon'

// Qui voit un dossier : soi seulement, ou aussi l'autre membre du foyer (shareLabel : « Moi et Quentin »)
export default function PrivacyChips({ value, shareLabel, canMakePrivate = true, onChange }: {
  value: boolean
  shareLabel: string
  canMakePrivate?: boolean
  onChange: (isPrivate: boolean) => void
}) {
  const choices = [
    { private: true, label: 'Moi seulement', icon: 'lock' as const, disabled: !canMakePrivate },
    { private: false, label: shareLabel, icon: 'users' as const, disabled: false },
  ]
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="eyebrow mb-2">Qui le voit</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map(choice => {
          const here = choice.private === value
          return (
            <button
              key={choice.label}
              type="button"
              aria-pressed={here}
              disabled={choice.disabled}
              onClick={() => { if (!here) onChange(choice.private) }}
              className={`chip inline-flex items-center gap-1.5 ${here ? 'is-active' : ''}`}
            >
              <Icon name={choice.icon} size={18} />
              {choice.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
