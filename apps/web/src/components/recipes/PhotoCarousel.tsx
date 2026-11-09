'use client'

import { useRef, useState } from 'react'

// Photos en haut de la fiche recette : on glisse de l'une à l'autre, la principale en premier.
// Des points en dessous disent où on en est (et permettent d'y aller) ; une seule photo = pas de points.
export default function PhotoCarousel({ urls }: { urls: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  function onScroll() {
    const track = trackRef.current
    if (!track) return
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  function goTo(i: number) {
    const track = trackRef.current
    if (track) track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
  }

  if (urls.length === 0) return null

  return (
    <div className="mb-4">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-3xl bg-coconut [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Photos de la recette"
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- photo déjà réduite (notre route ou Unsplash)
          <img
            key={url}
            src={url}
            alt={urls.length > 1 ? `Photo ${i + 1} sur ${urls.length}` : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            className="w-full shrink-0 snap-center aspect-[4/3] object-cover"
          />
        ))}
      </div>
      {urls.length > 1 && (
        <div className="flex justify-center gap-1 mt-1">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Voir la photo ${i + 1}`}
              aria-current={i === index}
              className="w-6 h-6 flex items-center justify-center"
            >
              <span className={`block rounded-full transition-all ${i === index ? 'w-2.5 h-2.5 bg-pink-deep' : 'w-2 h-2 bg-line'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
