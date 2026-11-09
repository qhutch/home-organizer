// Adresse de la photo de profil d'un membre ; version = userProfiles/{uid}.avatarVersion (null = pas de photo).
export function avatarUrl(uid: string, version: number | null | undefined) {
  return version ? `/api/avatars/${uid}?v=${version}` : null
}
