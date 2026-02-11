export const VOICE_BASE_URL =
  import.meta.env.VITE_VOICE_CHS_BASE_URL ??
  'https://giauc.lzray.cloud/genshin-voice-chinese/'

const normalizeBaseUrl = (base: string) => (base.endsWith('/') ? base : `${base}/`)

const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/^\/+/, '')

const replaceExtension = (value: string, ext: string) => {
  const normalized = normalizePath(value)
  if (!/\.[^/.]+$/.test(normalized)) return `${normalized}${ext}`
  return normalized.replace(/\.[^/.]+$/, ext)
}

const withBase = (base: string, value: string) => {
  const normalizedBase = normalizeBaseUrl(base)
  return new URL(normalizePath(value), normalizedBase).toString()
}

export const buildVoiceCandidates = (indexPath: string): string[] => {
  const base = VOICE_BASE_URL
  const normalized = normalizePath(indexPath)
  const flattened = (value: string) => value.replace(/\//g, '__')
  const withoutHex = normalized.replace(/__([0-9a-f]{16})(?=\.[^/.]+$)/, '')
  const candidates = [
    withBase(base, replaceExtension(flattened(withoutHex), '.opus')),
    withBase(base, replaceExtension(flattened(normalized), '.opus')),
    withBase(base, replaceExtension(normalized, '.opus')),
    withBase(base, replaceExtension(normalized, '.wav')),
  ]

  return Array.from(new Set(candidates))
}
