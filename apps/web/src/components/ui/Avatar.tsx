// Photo de profil d'un membre, ronde ; sans photo, l'initiale de son prénom sur fond coconut.
export default function Avatar({ name, url, size = 36, className = '' }: { name: string | null; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- petite photo déjà réduite, servie par notre route
    return <img src={url} alt="" style={style} className={`rounded-full object-cover shrink-0 bg-coconut ${className}`} />
  }
  return (
    <span aria-hidden style={style} className={`rounded-full bg-coconut flex items-center justify-center font-semibold text-ink shrink-0 ${className}`}>
      {name ? name[0].toUpperCase() : '?'}
    </span>
  )
}
