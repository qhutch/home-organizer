export type ShoppingItem = {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  notes: string | null
  inList: boolean
  addedBy: string
  createdAt: string
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
