import type { IndexesData, ManifestQuest, QuestData, SiteStats } from '../types/quest'
import type { SpeakersIndex } from '../types/speakers'
import { getLanguageConfig, type LangCode } from './languages'
import { getAssetUrl } from './utils'

const cache = new Map<string, any>()

const fetchJson = async <T>(
  path: string,
  cacheKey = path,
  signal?: AbortSignal,
): Promise<T> => {
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T
  const response = await fetch(getAssetUrl(path), { signal })
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }
  const data = (await response.json()) as T
  cache.set(cacheKey, data)
  return data
}

const fetchText = async (path: string, cacheKey = path, signal?: AbortSignal) => {
  if (cache.has(cacheKey)) return cache.get(cacheKey) as string
  const response = await fetch(getAssetUrl(path), { signal })
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }
  const data = await response.text()
  cache.set(cacheKey, data)
  return data
}

const getDataBase = (lang: LangCode) => {
  const config = getLanguageConfig(lang)
  return config.dataPath ? `data/${config.dataPath}` : 'data'
}

const getGeneratedBase = (lang: LangCode) => {
  const config = getLanguageConfig(lang)
  return config.generatedPath ? `generated/${config.generatedPath}` : 'generated'
}

export const getManifest = (lang: LangCode = 'zh', signal?: AbortSignal) =>
  fetchJson<ManifestQuest[]>(`${getDataBase(lang)}/manifest.json`, `${lang}:manifest`, signal)
export const getIndexes = (lang: LangCode = 'zh', signal?: AbortSignal) =>
  fetchJson<IndexesData>(`${getDataBase(lang)}/indexes.json`, `${lang}:indexes`, signal)
export const getSiteStats = (lang: LangCode = 'zh', signal?: AbortSignal) =>
  fetchJson<SiteStats>(`${getDataBase(lang)}/site_stats.json`, `${lang}:site_stats`, signal)
export const getQuestData = (id: number, lang: LangCode = 'zh', signal?: AbortSignal) =>
  fetchJson<QuestData>(
    `${getDataBase(lang)}/quests/${id}.json`,
    `${lang}:quest:${id}`,
    signal,
  )
const formatReadableMarkdown = (content: string) =>
  content.replace(/\*\*([^*\n]+?)：\*\*/g, '<strong>$1：</strong>')

export const getReadableMarkdown = async (
  path: string,
  lang: LangCode = 'zh',
  signal?: AbortSignal,
) => {
  const content = await fetchText(
    `${getDataBase(lang)}/${path}`,
    `${lang}:readable:${path}`,
    signal,
  )
  return formatReadableMarkdown(content)
}
export const getBuildInfo = (name: string, lang: LangCode = 'zh', signal?: AbortSignal) =>
  fetchJson<Record<string, any>>(
    `${getDataBase(lang)}/meta/${name}`,
    `${lang}:meta:${name}`,
    signal,
  )
export const getSubtitleText = (path: string, lang: LangCode = 'zh', signal?: AbortSignal) =>
  fetchText(`${getDataBase(lang)}/subtitles/${path}`, `${lang}:subtitle:${path}`, signal)
export const getSpeakersIndex = (lang: LangCode = 'zh', signal?: AbortSignal) =>
  fetchJson<SpeakersIndex>(
    `${getGeneratedBase(lang)}/speakers-index.json`,
    `${lang}:speakers`,
    signal,
  )

export const getQuestVoiceIndex = async (id: number, signal?: AbortSignal) => {
  const cacheKey = `voice:quest:${id}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) as Record<string, string[]>
  const path = `data/voice/voice_chs_folder/quest_${id}.json`
  const response = await fetch(getAssetUrl(path), { signal })
  if (response.status === 404) {
    const empty: Record<string, string[]> = {}
    cache.set(cacheKey, empty)
    return empty
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }
  const data = (await response.json()) as Record<string, string[]>
  cache.set(cacheKey, data)
  return data
}
