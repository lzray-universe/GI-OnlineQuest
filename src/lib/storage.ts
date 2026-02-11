const RECENT_KEY = 'onlinequest_recent'
const FAVORITES_KEY = 'onlinequest_favorites'
const READER_KEY_PREFIX = 'onlinequest_reader:'

export const getRecent = (): number[] => {
  const raw = localStorage.getItem(RECENT_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as number[]
  } catch {
    return []
  }
}

export const addRecent = (id: number) => {
  const next = [id, ...getRecent().filter((value) => value !== id)].slice(0, 20)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  return next
}

export const getFavorites = (): number[] => {
  const raw = localStorage.getItem(FAVORITES_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as number[]
  } catch {
    return []
  }
}

export const toggleFavorite = (id: number) => {
  const current = new Set(getFavorites())
  if (current.has(id)) {
    current.delete(id)
  } else {
    current.add(id)
  }
  const next = Array.from(current)
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  return next
}

export const getReaderPosition = (id: number) => {
  const raw = localStorage.getItem(`${READER_KEY_PREFIX}${id}`)
  if (!raw) return 0
  return Number(raw) || 0
}

export const setReaderPosition = (id: number, position: number) => {
  localStorage.setItem(`${READER_KEY_PREFIX}${id}`, position.toString())
}
