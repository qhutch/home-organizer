export type ShoppingItem = {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  notes: string | null
  // Rayon du magasin (id de AISLES dans lib/shopping/catalog.ts)
  category: string | null
  // Emoji choisi à la main (nom d'un fichier de public/emoji) ; null = celui du catalogue
  emoji: string | null
  inList: boolean
  addedBy: string
  createdAt: string
  // Dernier ajout, achat ou modification : sert à trier les récents
  updatedAt: string
}

export type Household = {
  id: string
  name: string
  createdAt: string
}

export type HouseholdMember = {
  userId: string
  role: 'owner' | 'member'
  joinedAt: string
}

export type Profile = {
  id: string
  displayName: string | null
  avatarUrl: string | null
  updatedAt: string
}
