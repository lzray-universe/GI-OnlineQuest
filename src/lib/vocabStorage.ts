import type { LangCode } from './languages'
import { getNormalizedTerm } from './dictionary'

export type VocabSource = {
  questId: number
  nodeId?: number
  subQuestId?: number
  columnLang?: string
  textSnippet?: string
}

export type VocabEntry = {
  id: string
  term: string
  normalizedTerm: string
  sourceLang: LangCode
  glossLang: LangCode
  meanings: string[]
  createdAt: number
  updatedAt: number
  sources: VocabSource[]
}

export type VocabFilter = {
  sourceLang?: LangCode
  glossLang?: LangCode
  searchTerm?: string
  dateRange?: { from?: number; to?: number }
}

export const VOCAB_STORAGE_KEY = 'onlinequest_vocab'

const readAll = (): VocabEntry[] => {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(VOCAB_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as VocabEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

const writeAll = (entries: VocabEntry[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(entries))
}

const buildId = (sourceLang: LangCode, glossLang: LangCode, normalizedTerm: string) =>
  `${sourceLang}:${glossLang}:${normalizedTerm}`

const mergeSources = (existing: VocabSource[], incoming: VocabSource[]) => {
  const merged = [...existing]
  const seen = new Set(existing.map((source) => JSON.stringify(source)))
  incoming.forEach((source) => {
    const key = JSON.stringify(source)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(source)
    }
  })
  return merged
}

export const listVocab = (filter: VocabFilter = {}) => {
  const { sourceLang, glossLang, searchTerm, dateRange } = filter
  let entries = readAll()
  if (sourceLang) {
    entries = entries.filter((entry) => entry.sourceLang === sourceLang)
  }
  if (glossLang) {
    entries = entries.filter((entry) => entry.glossLang === glossLang)
  }
  if (searchTerm) {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    entries = entries.filter((entry) =>
      entry.term.toLowerCase().includes(normalizedSearch)
    )
  }
  if (dateRange?.from || dateRange?.to) {
    entries = entries.filter((entry) => {
      if (dateRange.from && entry.createdAt < dateRange.from) return false
      if (dateRange.to && entry.createdAt > dateRange.to) return false
      return true
    })
  }
  return entries.sort((a, b) => b.createdAt - a.createdAt)
}

export const isSaved = (sourceLang: LangCode, glossLang: LangCode, term: string) => {
  const normalized = getNormalizedTerm(term, sourceLang)
  const id = buildId(sourceLang, glossLang, normalized)
  return readAll().some((entry) => entry.id === id)
}

export const toggleSave = (entry: Omit<VocabEntry, 'id' | 'normalizedTerm' | 'createdAt' | 'updatedAt'>) => {
  const normalizedTerm = getNormalizedTerm(entry.term, entry.sourceLang)
  const id = buildId(entry.sourceLang, entry.glossLang, normalizedTerm)
  const entries = readAll()
  const index = entries.findIndex((item) => item.id === id)
  const now = Date.now()
  if (index >= 0) {
    const existing = entries[index]
    if (existing.meanings.length === 0 && entry.meanings.length > 0) {
      const updated: VocabEntry = {
        ...existing,
        meanings: entry.meanings,
        updatedAt: now,
        sources: mergeSources(existing.sources, entry.sources),
      }
      entries[index] = updated
      writeAll(entries)
      return entries
    }
    entries.splice(index, 1)
    writeAll(entries)
    return entries
  }
  const next: VocabEntry = {
    ...entry,
    id,
    normalizedTerm,
    createdAt: now,
    updatedAt: now,
  }
  entries.unshift(next)
  writeAll(entries)
  return entries
}

export const exportJSON = () => {
  return JSON.stringify(readAll(), null, 2)
}

export const exportCSV = () => {
  const entries = readAll()
  const header = ['date', 'sourceLang', 'glossLang', 'term', 'meanings', 'sources']
  const rows = entries.map((entry) => {
    const date = new Date(entry.createdAt).toISOString().split('T')[0]
    const meanings = entry.meanings.join(' | ')
    const sources = JSON.stringify(entry.sources)
    return [date, entry.sourceLang, entry.glossLang, entry.term, meanings, sources]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  })
  return `\ufeff${[header.join(','), ...rows].join('\n')}`
}
