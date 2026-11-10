'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import RecipeForm from '@/components/recipes/RecipeForm'
import PhotoPicker, { type PickedPhoto } from '@/components/recipes/PhotoPicker'
import { FEATURES } from '@/lib/ui/features'
import { IMPORT_PROMPT, parseImportCode, type ImportedRecipe } from '@/lib/recipes/import-code'

// Import avec Claude : copier la consigne, demander à Claude, ajouter une photo (facultatif), coller son code.
// Dès que le code est reconnu, la recette s'affiche dans le formulaire pour qu'on la vérifie.
export default function RecipeImport({ equipmentSuggestions }: { equipmentSuggestions: string[] }) {
  const [code, setCode] = useState('')
  const [recipe, setRecipe] = useState<ImportedRecipe | null>(null)
  const [copied, setCopied] = useState(false)
  const [photo, setPhoto] = useState<PickedPhoto | null>(null)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  if (recipe) {
    return (
      <>
        <h1 className="text-3xl mb-4">Vérifie la recette</h1>
        <button type="button" onClick={() => { setRecipe(null); setCode('') }} className={`text-sm font-medium underline mb-6 ${FEATURES.recipes.text}`}>
          Coller un autre code
        </button>
        <RecipeForm initial={recipe} initialPhoto={photo} equipmentSuggestions={equipmentSuggestions} />
      </>
    )
  }

  const step = 'w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-display font-semibold bg-rose text-rose-ink'

  return (
    <>
      <h1 className="text-3xl mb-6">Importer avec Claude</h1>
      <ol className="flex flex-col gap-2">
        <li className="card flex gap-4">
          <span className={step}>1</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium mb-3">Copie la consigne</p>
            <button type="button" onClick={copyPrompt} className="btn-outline">
              <Icon name={copied ? 'check' : 'copy'} size={20} /> {copied ? 'Consigne copiée' : 'Copier la consigne'}
            </button>
          </div>
        </li>
        <li className="card flex gap-4">
          <span className={step}>2</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Dans Claude, colle la consigne et envoie ta recette</p>
            <p className="text-sm text-ink-muted mt-1">Une photo, une capture d’écran Insta, un lien ou un texte.</p>
          </div>
        </li>
        <li className="card flex gap-4">
          <span className={step}>3</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Ajoute une photo</p>
            <p className="text-sm text-ink-muted mt-1 mb-3">Facultatif : une capture du post, ou ta photo du plat.</p>
            <PhotoPicker photo={photo} onChange={setPhoto} />
          </div>
        </li>
        <li className="card flex gap-4">
          <span className={step}>4</span>
          <div className="flex-1 min-w-0">
            <label htmlFor="recipe-code" className="font-medium block mb-3">Colle ici le code que Claude te répond</label>
            <textarea
              id="recipe-code"
              value={code}
              onChange={e => {
                setCode(e.target.value)
                setRecipe(parseImportCode(e.target.value))
              }}
              rows={4}
              placeholder="{ &quot;hestia&quot;: &quot;recette&quot;, … }"
              className="field !text-sm font-mono"
              aria-describedby={code.trim() ? 'recipe-code-error' : undefined}
            />
            {code.trim() && (
              <p id="recipe-code-error" className="text-sm text-pink-deep mt-2" role="status">
                Ce code n’est pas reconnu. Copie bien tout le bloc donné par Claude.
              </p>
            )}
          </div>
        </li>
      </ol>
    </>
  )
}
