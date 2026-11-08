// Emoji Fluent de Microsoft (licence MIT), servi depuis public/emoji.
// Le même dessin sur tous les appareils, lisible sur le fond crème des tuiles.
export default function Emoji({ name, size = 40, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/emoji/${name}.png`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 select-none pointer-events-none ${className}`}
    />
  )
}
