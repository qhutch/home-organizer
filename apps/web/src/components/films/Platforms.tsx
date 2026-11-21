import { logoUrl } from '@/lib/films/images'
import { isOurs, PLATFORM_BY_ID, sortProviders, viaLabel, type PlatformSettings } from '@/lib/films/platforms'
import type { WatchProvider } from '@/types/database'

function Logo({ provider, size }: { provider: WatchProvider; size: number }) {
  const url = logoUrl(provider.logo)
  const style = { width: size, height: size }
  if (!url) return <span aria-hidden style={style} className="rounded-md bg-coconut shrink-0" />
  // eslint-disable-next-line @next/next/no-img-element -- petit logo servi par TMDB
  return <img src={url} alt="" style={style} className="rounded-md shrink-0" />
}

function name(provider: WatchProvider) {
  return (provider.platform && PLATFORM_BY_ID.get(provider.platform)?.name) || provider.name
}

// Sur une carte : la plateforme où le voir, la nôtre d'abord (en gras) ; sinon une autre, estompée
export function PlatformBadge({ providers, rentable, settings }: { providers: WatchProvider[]; rentable: boolean; settings: PlatformSettings }) {
  const sorted = sortProviders(providers, settings)
  const first = sorted[0]
  if (!first) return <p className="text-xs text-ink-faint truncate">{rentable ? 'À louer ou acheter' : 'Pas en streaming'}</p>
  const ours = isOurs(first.platform, settings)
  return (
    <p className={`text-xs flex items-center gap-1.5 min-w-0 ${ours ? 'font-semibold text-ink' : 'text-ink-faint'}`}>
      <Logo provider={first} size={16} />
      <span className="truncate">{name(first)}{!ours && ' · pas chez vous'}</span>
    </p>
  )
}

// Sur la fiche : toutes les plateformes, les nôtres d'abord (« dans votre Canal+ »)
export function PlatformList({ providers, rentable, settings }: { providers: WatchProvider[]; rentable: boolean; settings: PlatformSettings }) {
  const sorted = sortProviders(providers, settings)
  const ours = sorted.filter(p => isOurs(p.platform, settings))
  const others = sorted.filter(p => !isOurs(p.platform, settings))
  return (
    <div className="flex flex-col gap-2">
      {ours.map(p => (
        <div key={p.name} className="flex items-center gap-3 rounded-3xl bg-sable-soft px-4 py-3">
          <Logo provider={p} size={36} />
          <div className="min-w-0">
            <p className="font-semibold">{name(p)}</p>
            {viaLabel(p.platform, settings) && <p className="text-sm text-sable-deep">{viaLabel(p.platform, settings)}</p>}
          </div>
        </div>
      ))}
      {others.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-sm text-ink-muted">
          <span>{ours.length ? 'Aussi sur' : 'Sur'}</span>
          {others.map(p => (
            <span key={p.name} className="flex items-center gap-1.5">
              <Logo provider={p} size={20} />
              {name(p)}
            </span>
          ))}
          {!ours.length && <span className="text-ink-faint">· pas chez vous</span>}
        </div>
      )}
      {!sorted.length && <p className="text-sm text-ink-muted">{rentable ? 'Pas en streaming : à louer ou acheter' : 'Pas encore en streaming en France'}</p>}
      {sorted.length > 0 && rentable && !ours.length && <p className="text-sm text-ink-muted">Ou à louer, acheter</p>}
    </div>
  )
}
