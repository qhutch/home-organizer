'use client'

import { useState, useTransition } from 'react'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import type { Feedback } from '@/lib/feedback'
import { deleteFeedback, sendFeedback } from './actions'

type Author = { name: string | null; avatarUrl: string | null }

const day = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

// Réglages › Retours : on note ce qui ne va pas ou ce qu'on aimerait dans l'app ; Claude les lit en début de session
// et répond une fois le retour traité.
export default function FeedbackBox({ items, authors }: { items: Feedback[]; authors: Record<string, Author> }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function send() {
    if (!text.trim()) return
    startTransition(async () => {
      setError(null)
      const result = await sendFeedback(text)
      if (result.error) setError(result.error)
      else setText('')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="card flex flex-col gap-3"
        onSubmit={e => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="field min-h-24 resize-y"
          placeholder="Un bug, une idée, quelque chose à changer…"
          aria-label="Nouveau retour"
        />
        {error && <p className="text-sm text-pink-deep">{error}</p>}
        <button type="submit" className="btn-outline self-end" disabled={pending || !text.trim()}>
          {pending ? 'Envoi…' : 'Envoyer le retour'}
        </button>
      </form>

      {items.map(item => {
        const author = authors[item.createdBy]
        return (
          <div key={item.id} className="card flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <Avatar name={author?.name ?? null} url={author?.avatarUrl} size={28} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm whitespace-pre-wrap break-words">{item.text}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {day(item.createdAt)} · {item.status === 'done' ? 'Traité' : 'En attente'}
                </p>
              </div>
              {item.status === 'new' && (
                <button
                  type="button"
                  className="icon-btn icon-btn-sm shrink-0"
                  aria-label="Retirer ce retour"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await deleteFeedback(item.id) })}
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
            {item.status === 'done' && item.reply && (
              <div className="bg-coconut rounded-2xl px-3 py-2 flex items-start gap-2 text-sm">
                <Icon name="check" size={18} className="shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap break-words">{item.reply}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
