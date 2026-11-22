// Recettes importées par un lien : beaucoup de sites mettent plusieurs étapes dans un seul paragraphe
// (« Préchauffer le four. Couper les légumes. Les faire revenir 5 min… »). En mode cuisine, une étape =
// un écran : on recoupe ces paragraphes, phrase par phrase, en gardant ensemble les phrases courtes
// (« Saler. Poivrer. ») pour ne pas faire un écran par mot.

// En dessous, l'étape reste telle quelle
const LONG_STEP = 160
// Une étape coupée fait au moins ça (sinon la phrase suivante la rejoint)
const MIN_PART = 70

// Une fin de phrase : point, ! ou ?, puis une majuscule (« c. à soupe », « env. 5 min » ne coupent pas)
const SENTENCE_END = /(?<=[.!?…])\s+(?=[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ«"(])/u
// Une liste numérotée dans le texte : « 1. Couper… 2. Cuire… » ou « 1) … 2) … »
const NUMBERED = /\s+(?=\d{1,2}\s?[.)]\s+[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ])/u
const NUMBER_PREFIX = /^\d{1,2}\s?[.)]\s+/

// Une phrase qui continue la précédente plutôt qu'elle ne commence une nouvelle étape : un geste de suite
// (« Remuez de temps en temps », « Mélangez », « Salez et poivrez », « Réservez »), une précision
// (« Les légumes doivent… », « Attention… ») ou la fin (« Servez chaud »).
const FOLLOW_UP = /^(remue|melange|sale|poivre|reserve|laisse|retire|egoutte|sers|serve|degust|bon appetit|attention|astuce|les |le |la |l'|il |elle |ils |elles |cela |ca |ce |cette |puis |ensuite )/

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/’/g, "'")

export function splitStep(text: string): string[] {
  const step = text.trim()
  if (step.length < LONG_STEP) return step ? [step] : []
  // Déjà numérotée par le site : une étape par numéro
  const numbered = step.split(NUMBERED).map(s => s.replace(NUMBER_PREFIX, '').trim()).filter(Boolean)
  if (numbered.length > 1) return numbered
  const sentences = step.split(SENTENCE_END).map(s => s.trim()).filter(Boolean)
  if (sentences.length < 2) return [step]

  const parts: string[] = []
  for (const sentence of sentences) {
    const last = parts.length - 1
    if (last >= 0 && (parts[last].length < MIN_PART || FOLLOW_UP.test(fold(sentence)))) parts[last] += ` ${sentence}`
    else parts.push(sentence)
  }
  // Une dernière phrase trop courte (« Servir chaud. ») reste avec la précédente
  if (parts.length > 1 && parts[parts.length - 1].length < MIN_PART / 2) {
    const tail = parts.pop()!
    parts[parts.length - 1] += ` ${tail}`
  }
  return parts
}

export function splitSteps(steps: string[]): string[] {
  return steps.flatMap(splitStep)
}
