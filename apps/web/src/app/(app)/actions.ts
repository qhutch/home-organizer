'use server'

import { db } from '@/lib/firebase/admin'
import { getSessionUser, getUserHousehold } from '@/lib/firebase/session'
import { aisleFor, isAisleId, isEmojiName, itemKey, sameItemName } from '@/lib/shopping/catalog'
import type { ShoppingItem } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { FieldValue } from 'firebase-admin/firestore'

export type ShoppingItemDetails = {
  quantity: number | null
  unit: string
  notes: string
  category: string | null
  // null = l'emoji du catalogue
  emoji: string | null
}

async function shoppingItemsCollection() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const membership = await getUserHousehold(user.uid)
  if (!membership) redirect('/setup')

  const household = db.collection('households').doc(membership.householdId)
  return {
    user,
    collection: household.collection('shoppingItems'),
    memory: household.collection('itemMemory'),
  }
}

// Mémoire des produits : l'emoji et le rayon choisis à la main pour un nom d'article,
// gardés même si l'article est supprimé, et remis quand on rajoute ce produit.
// Un doc par nom (clé de itemKey) ; null = le choix automatique.
export type ItemMemory = { emoji: string | null; category: string | null }

type MemoryCollection = FirebaseFirestore.CollectionReference

function memoryRef(memory: MemoryCollection, name: string) {
  return memory.doc(encodeURIComponent(itemKey(name)) || '_')
}

// Met la mémoire à jour d'après les choix d'un article. Un rayon égal au rayon automatique
// n'est pas un choix : il n'est pas gardé.
async function remember(memory: MemoryCollection, name: string, emoji: string | null, category: string | null) {
  const ref = memoryRef(memory, name)
  const wanted: ItemMemory = { emoji, category: category && category !== aisleFor(name) ? category : null }
  const current = (await ref.get()).data()
  if ((current?.emoji ?? null) === wanted.emoji && (current?.category ?? null) === wanted.category) return
  if (!wanted.emoji && !wanted.category) await ref.delete()
  else await ref.set({ name, ...wanted, updatedAt: FieldValue.serverTimestamp() })
}

// Toute la mémoire du foyer, par clé de nom (itemKey).
export async function getItemMemory(): Promise<Record<string, ItemMemory>> {
  const user = await getSessionUser()
  if (!user) return {}
  const membership = await getUserHousehold(user.uid)
  if (!membership) return {}

  const snapshot = await db.collection('households').doc(membership.householdId).collection('itemMemory').get()
  return Object.fromEntries(snapshot.docs.map(doc => {
    const d = doc.data()
    return [itemKey(d.name as string), {
      emoji: isEmojiName(d.emoji) ? d.emoji : null,
      category: isAisleId(d.category) ? d.category : null,
    }]
  }))
}

function cleanDetails(name: string, details: ShoppingItemDetails) {
  const quantity = details.quantity && Number.isFinite(details.quantity) && details.quantity > 0
    ? details.quantity
    : null
  return {
    quantity,
    unit: details.unit.trim().slice(0, 20) || null,
    notes: details.notes.trim().slice(0, 200) || null,
    category: isAisleId(details.category) ? details.category : aisleFor(name),
    emoji: isEmojiName(details.emoji) ? details.emoji : null,
  }
}

export async function getShoppingItems(): Promise<ShoppingItem[]> {
  const user = await getSessionUser()
  if (!user) return []

  const membership = await getUserHousehold(user.uid)
  if (!membership) return []

  const snapshot = await db
    .collection('households')
    .doc(membership.householdId)
    .collection('shoppingItems')
    .orderBy('createdAt', 'desc')
    .get()

  return snapshot.docs.map(doc => {
    const d = doc.data()
    const createdAt = d.createdAt?.toDate?.().toISOString() ?? ''
    return {
      id: doc.id,
      name: d.name as string,
      quantity: (d.quantity as number) ?? null,
      unit: (d.unit as string) ?? null,
      notes: (d.notes as string) ?? null,
      category: (d.category as string) ?? null,
      emoji: (d.emoji as string) ?? null,
      inList: d.inList as boolean,
      addedBy: d.addedBy as string,
      createdAt,
      updatedAt: d.updatedAt?.toDate?.().toISOString() ?? createdAt,
    }
  })
}

// Ajoute un article. S'il existe déjà (dans la liste ou dans les récents),
// il est remis dans la liste au lieu d'être créé en double.
export async function addShoppingItem(name: string, details: ShoppingItemDetails) {
  const itemName = name.trim().slice(0, 80)
  if (!itemName) return

  const { user, collection, memory } = await shoppingItemsCollection()
  // La liste envoie déjà l'emoji et le rayon tirés de la mémoire (voir ShoppingList).
  const fields = cleanDetails(itemName, details)
  await remember(memory, itemName, fields.emoji, fields.category)

  const snapshot = await collection.get()
  const existing = snapshot.docs.find(doc => sameItemName(doc.data().name as string, itemName))

  if (existing) {
    const hasDetails = fields.quantity || fields.unit || fields.notes
    await existing.ref.update({
      inList: true,
      category: fields.category,
      emoji: fields.emoji,
      ...(hasDetails ? { quantity: fields.quantity, unit: fields.unit, notes: fields.notes } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })
  } else {
    await collection.add({
      name: itemName,
      ...fields,
      inList: true,
      addedBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  revalidatePath('/shopping')
}

// inList = true : à acheter ; false : acheté (passe dans les récents).
export async function setShoppingItemInList(itemId: string, inList: boolean) {
  const { collection } = await shoppingItemsCollection()

  await collection.doc(itemId).update({
    inList,
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath('/shopping')
}

export async function updateShoppingItem(itemId: string, details: ShoppingItemDetails) {
  const { collection, memory } = await shoppingItemsCollection()
  const ref = collection.doc(itemId)
  const doc = await ref.get()
  if (!doc.exists) return

  const name = doc.data()?.name as string
  const fields = cleanDetails(name, details)
  await remember(memory, name, fields.emoji, fields.category)

  await ref.update({
    ...fields,
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath('/shopping')
}

export async function deleteShoppingItem(itemId: string) {
  const { collection } = await shoppingItemsCollection()

  await collection.doc(itemId).delete()

  revalidatePath('/shopping')
}

// Ajoute les ingrédients d'une recette à la liste, d'un coup.
// Un article déjà dans la liste n'est pas écrasé : s'il a la même unité, les quantités s'additionnent
// (200 g + 100 g de farine = 300 g), sinon on garde ce qui était noté. Un article des récents
// revient dans la liste avec la quantité de la recette. L'emoji et le rayon suivent la mémoire des produits.
export async function addIngredientsToShopping(ingredients: { name: string; quantity: number | null; unit: string | null }[]) {
  const { user, collection, memory } = await shoppingItemsCollection()
  const [snapshot, memorySnapshot] = await Promise.all([collection.get(), memory.get()])
  const remembered = new Map(memorySnapshot.docs.map(doc => [itemKey(doc.data().name as string), doc.data()]))

  const batch = db.batch()
  const handled: string[] = []
  let added = 0

  for (const ingredient of ingredients.slice(0, 100)) {
    const name = ingredient.name.trim().slice(0, 80)
    if (!name || handled.some(n => sameItemName(n, name))) continue
    handled.push(name)
    const quantity = ingredient.quantity && Number.isFinite(ingredient.quantity) && ingredient.quantity > 0 ? ingredient.quantity : null
    const unit = ingredient.unit?.trim().slice(0, 20) || null

    const existing = snapshot.docs.find(doc => sameItemName(doc.data().name as string, name))
    if (existing) {
      const d = existing.data()
      const update: Record<string, unknown> = { inList: true, updatedAt: FieldValue.serverTimestamp() }
      if (!d.inList) Object.assign(update, { quantity, unit })
      else if (quantity && d.quantity && (d.unit ?? null) === unit) update.quantity = Math.round((d.quantity + quantity) * 100) / 100
      batch.update(existing.ref, update)
    } else {
      const mem = remembered.get(itemKey(name))
      batch.set(collection.doc(), {
        name,
        quantity,
        unit,
        notes: null,
        category: isAisleId(mem?.category) ? mem.category : aisleFor(name),
        emoji: isEmojiName(mem?.emoji) ? mem.emoji : null,
        inList: true,
        addedBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    added++
  }

  if (added) await batch.commit()
  revalidatePath('/shopping')
  return { added }
}
