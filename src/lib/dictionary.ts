import type { LangCode } from './languages'

export type DictionaryError = 'api_unreachable'

export type DictionaryResult = {
  phonetic?: string
  meanings: string[]
  raw?: unknown
  provider: string
  externalUrl?: string
  error?: DictionaryError
}

const CACHE = new Map<string, DictionaryResult>()
const DEFAULT_TIMEOUT = 8000

const normalizeTerm = (term: string, lang: LangCode) => {
  const trimmed = term.trim().replace(/\s+/g, ' ')
  if (lang === 'en') return trimmed.toLowerCase()
  return trimmed
}

const fetchJson = async (url: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }
    return (await response.json()) as unknown
  } finally {
    clearTimeout(timeout)
  }
}

const translateViaMyMemory = async (term: string, sourceLang: LangCode, targetLang: LangCode) => {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    term
  )}&langpair=${sourceLang}|${targetLang}`
  const data = (await fetchJson(url)) as any
  const translated = data?.responseData?.translatedText
  if (!translated) {
    throw new Error('MyMemory translation missing')
  }
  return String(translated)
}

const translateViaLibre = async (term: string, sourceLang: LangCode, targetLang: LangCode) => {
  const data = (await fetchJson(
    'https://libretranslate.de/translate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: term,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    },
    10000
  )) as any
  if (!data?.translatedText) {
    throw new Error('LibreTranslate translation missing')
  }
  return String(data.translatedText)
}

const translateText = async (term: string, sourceLang: LangCode, targetLang: LangCode) => {
  try {
    const translated = await translateViaMyMemory(term, sourceLang, targetLang)
    return { provider: 'MyMemory', text: translated }
  } catch (error) {
    const translated = await translateViaLibre(term, sourceLang, targetLang)
    return { provider: 'LibreTranslate', text: translated }
  }
}

const lookupEnglishDictionary = async (term: string): Promise<DictionaryResult> => {
  const data = (await fetchJson(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`
  )) as any
  const entry = Array.isArray(data) ? data[0] : null
  const phonetic =
    entry?.phonetic ??
    entry?.phonetics?.find((item: any) => item?.text)?.text ??
    undefined
  const meanings =
    entry?.meanings
      ?.flatMap((meaning: any) => meaning?.definitions?.map((def: any) => def?.definition))
      ?.filter(Boolean)
      ?.slice(0, 3) ?? []
  return {
    phonetic,
    meanings: meanings.length ? meanings : ['(No definition found)'],
    raw: entry,
    provider: 'dictionaryapi.dev',
    externalUrl: `https://www.dictionary.com/browse/${encodeURIComponent(term)}`,
  }
}

const lookupJisho = async (term: string) => {
  const data = (await fetchJson(
    `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(term)}`
  )) as any
  const entry = data?.data?.[0]
  const meanings =
    entry?.senses
      ?.flatMap((sense: any) => sense?.english_definitions ?? [])
      ?.filter(Boolean)
      ?.slice(0, 3) ?? []
  return {
    meanings,
    raw: entry,
  }
}

export const lookup = async (
  term: string,
  sourceLang: LangCode,
  glossLang: LangCode
): Promise<DictionaryResult> => {
  const normalized = normalizeTerm(term, sourceLang)
  const cacheKey = `${sourceLang}:${glossLang}:${normalized}`
  const cached = CACHE.get(cacheKey)
  if (cached) return cached

  try {
    let result: DictionaryResult
    if (sourceLang === 'en') {
      if (glossLang === 'en') {
        result = await lookupEnglishDictionary(term)
      } else {
        const translated = await translateText(term, sourceLang, glossLang)
        result = {
          meanings: [translated.text],
          provider: translated.provider,
          externalUrl: `https://translate.google.com/?sl=en&tl=${glossLang}&text=${encodeURIComponent(
            term
          )}`,
        }
      }
    } else if (sourceLang === 'ja') {
      const jisho = await lookupJisho(term)
      if (glossLang === 'en') {
        result = {
          meanings: jisho.meanings.length ? jisho.meanings : ['(No definition found)'],
          raw: jisho.raw,
          provider: 'Jisho',
          externalUrl: `https://jisho.org/search/${encodeURIComponent(term)}`,
        }
      } else if (glossLang === 'zh') {
        const base = jisho.meanings.join('; ')
        if (!base) {
          result = {
            meanings: ['(No definition found)'],
            raw: jisho.raw,
            provider: 'Jisho',
            externalUrl: `https://jisho.org/search/${encodeURIComponent(term)}`,
          }
        } else {
          const translated = await translateText(base, 'en', 'zh')
          result = {
            meanings: [translated.text],
            raw: jisho.raw,
            provider: `Jisho + ${translated.provider}`,
            externalUrl: `https://jisho.org/search/${encodeURIComponent(term)}`,
          }
        }
      } else {
        const translated = await translateText(term, sourceLang, glossLang)
        result = {
          meanings: [translated.text],
          provider: translated.provider,
          externalUrl: `https://translate.google.com/?sl=ja&tl=${glossLang}&text=${encodeURIComponent(
            term
          )}`,
        }
      }
    } else {
      if (glossLang === 'zh') {
        result = {
          meanings: ['暂无内置词典释义'],
          provider: 'Fallback',
          externalUrl: `https://www.zdic.net/hans/${encodeURIComponent(term)}`,
        }
      } else {
        const translated = await translateText(term, sourceLang, glossLang)
        result = {
          meanings: [translated.text],
          provider: translated.provider,
          externalUrl: `https://translate.google.com/?sl=zh-CN&tl=${glossLang}&text=${encodeURIComponent(
            term
          )}`,
        }
      }
    }
    CACHE.set(cacheKey, result)
    return result
  } catch (error) {
    const fallback: DictionaryResult = {
      meanings: ['(No definition found)'],
      provider: 'Fallback',
      externalUrl:
        sourceLang === 'ja'
          ? `https://jisho.org/search/${encodeURIComponent(term)}`
          : `https://translate.google.com/?sl=${sourceLang}&tl=${glossLang}&text=${encodeURIComponent(
              term
            )}`,
      error: 'api_unreachable',
    }
    CACHE.set(cacheKey, fallback)
    return fallback
  }
}

export const getNormalizedTerm = (term: string, lang: LangCode) => normalizeTerm(term, lang)
