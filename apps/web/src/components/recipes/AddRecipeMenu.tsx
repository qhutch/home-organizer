'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'
import { FEATURES } from '@/lib/ui/features'

const CHOICES: { href: string; icon: IconName; title: string }[] = [
  { href: '/recipes/new/link', icon: 'link', title: 'Depuis un lien' },
  { href: '/recipes/new/import', icon: 'import', title: 'Importer avec Claude' },
  { href: '/recipes/new/write', icon: 'pencil', title: 'Écrire moi-même' },
]

// Le + de la bibliothèque : il ouvre en éventail, juste au-dessus de lui, les trois façons d'ajouter
// une recette, par-dessus la page assombrie. Le + devient un × pour refermer.
export default function AddRecipeMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Voile sur la page : toucher à côté referme */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-ink/30 transition-opacity duration-200 motion-reduce:transition-none ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <div className="relative pointer-events-auto">
        <ul
          id="add-recipe-menu"
          className={`absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2 ${open ? '' : 'pointer-events-none'}`}
          aria-hidden={!open}
        >
          {CHOICES.map((c, i) => (
            <li
              key={c.href}
              // Le plus proche du + arrive en premier, les autres juste après
              style={{ transitionDelay: open ? `${(CHOICES.length - 1 - i) * 50}ms` : '0ms' }}
              className={`transition-all duration-200 ease-out motion-reduce:transition-none ${open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}
            >
              <Link
                href={c.href}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-full bg-surface hairline pl-5 pr-1.5 py-1.5 whitespace-nowrap text-sm font-semibold hover:bg-coconut"
              >
                {c.title}
                <span className={`w-11 h-11 rounded-full flex items-center justify-center ${FEATURES.recipes.soft} ${FEATURES.recipes.text}`}>
                  <Icon name={c.icon} size={22} />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="add-recipe-menu"
          aria-label={open ? 'Fermer' : 'Ajouter une recette'}
          className={`icon-btn-fill icon-btn-lg ${FEATURES.recipes.fill}`}
        >
          <span className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-45' : ''}`}>
            <Icon name="plus" />
          </span>
        </button>
      </div>
    </>
  )
}
