import { createElement, type ReactNode } from 'react'

export type PlayerTextSettings = {
  playerName: string
  playerGender: 'M' | 'F'
  realnameId1: string
  realnameId2: string
}

const SEXPRO_SUFFIX_MAP: Record<string, string> = {
  _HE: '他',
  _SHE: '她',
  _KONG: '空',
  _YING: '荧',
  _BROTHER: '哥哥',
  _SISTER: '姐姐',
  _SISTERA: '姐姐',
  _UNCLE: '叔叔',
  _AUNT: '阿姨',
}

const mapSexproToken = (token: string): string | null => {
  const normalized = token.trim().toUpperCase()
  const match = Object.entries(SEXPRO_SUFFIX_MAP).find(([suffix]) => normalized.endsWith(suffix))
  return match ? match[1] : null
}

const applyCommonGameTextReplacements = (raw: string, settings: PlayerTextSettings): string => {
  if (!raw) return ''
  let text = raw

  text = text.replace(/^#/gm, '')
  text = text.replace(/<(?!\/?color\b)[^>]+>/gi, '')
  text = text.replace(/\{RUBY#\[[^\]]*]([^}]+)\}/g, '（$1）')
  text = text.replace(/\{NICKNAME\}/g, settings.playerName)
  text = text.replace(/\{M#([^}]*)\}\{F#([^}]*)\}/g, (_, male, female) =>
    settings.playerGender === 'M' ? male : female
  )
  text = text.replace(/\{F#([^}]*)\}\{M#([^}]*)\}/g, (_, female, male) =>
    settings.playerGender === 'M' ? male : female
  )
  text = text.replace(
    /\{REALNAME\[ID\(2\)\|SHOWHOST\(true\)\]\}/g,
    settings.realnameId2
  )
  text = text.replace(
    /\{REALNAME\[ID\(1\)\|HOSTONLY\(true\)\]\}/g,
    settings.realnameId1
  )
  text = text.replace(
    /\{TMPVALUE\(TMP_VALUE_KEY_TYPE_LITTLE_DRILL_TMP_NAME\)\}/g,
    settings.realnameId2
  )
  text = text.replace(
    /\{(PLAYERAVATAR|MATEAVATAR)#SEXPRO\[([^\]|]+)\|([^\]]+)\]\}/g,
    (_, kind: 'PLAYERAVATAR' | 'MATEAVATAR', maleToken: string, femaleToken: string) => {
      const pickMale = kind === 'PLAYERAVATAR' ? settings.playerGender === 'M' : settings.playerGender !== 'M'
      const token = pickMale ? maleToken : femaleToken
      const mapped = mapSexproToken(token)
      if (mapped) return mapped
      return kind === 'PLAYERAVATAR' ? settings.playerName || '你' : '对方'
    }
  )

  text = text.replace(/\s*\$[A-Z_]+/g, '')
  text = text.replace(/[ \t]{2,}/g, ' ')
  text = text.replace(/[ \t]*\n[ \t]*/g, '\n')

  return text.trim()
}

export function formatGameTextPlain(raw: string, settings: PlayerTextSettings): string {
  let text = applyCommonGameTextReplacements(raw, settings)
  text = text.replace(/<\/?color(?:=[^>]+)?>/gi, '')
  return text.trim()
}

export const formatGameText = (raw: string, settings: PlayerTextSettings): string =>
  formatGameTextPlain(raw, settings)

type ColoredSegment = {
  text: string
  color?: string
}

export function unityHexToRgba(hex: string): string | null {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(normalized)) return null
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const aValue = normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) : 255
  const a = Number((aValue / 255).toFixed(3))
  return `rgba(${r},${g},${b},${a})`
}

const parseColorSegments = (input: string): ColoredSegment[] => {
  const segments: ColoredSegment[] = []
  const colorStack: string[] = []
  const tagRegex = /<\/?color(?:=[^>]+)?>/gi
  let lastIndex = 0
  let match: RegExpExecArray | null

  const pushText = (value: string) => {
    if (!value) return
    const color = colorStack.length ? colorStack[colorStack.length - 1] : undefined
    const last = segments[segments.length - 1]
    if (last && last.color === color) {
      last.text += value
      return
    }
    segments.push({ text: value, color })
  }

  while ((match = tagRegex.exec(input))) {
    const tag = match[0]
    const index = match.index
    pushText(input.slice(lastIndex, index))

    if (tag.toLowerCase().startsWith('</')) {
      if (colorStack.length) {
        colorStack.pop()
      } else {
        pushText(tag)
      }
      lastIndex = index + tag.length
      continue
    }

    const colorMatch = /<color=([^>]+)>/i.exec(tag)
    if (!colorMatch) {
      pushText(tag)
      lastIndex = index + tag.length
      continue
    }

    const rgba = unityHexToRgba(colorMatch[1])
    if (!rgba) {
      pushText(tag)
      lastIndex = index + tag.length
      continue
    }

    colorStack.push(rgba)
    lastIndex = index + tag.length
  }

  pushText(input.slice(lastIndex))
  return segments
}

export function renderGameText(raw: string, settings: PlayerTextSettings): ReactNode {
  const textWithColorTags = applyCommonGameTextReplacements(raw, settings)
  const segments = parseColorSegments(textWithColorTags)

  return segments.map((segment, index) =>
    createElement(
      'span',
      { key: `segment-${index}`, style: segment.color ? { color: segment.color } : undefined },
      segment.text
    )
  )
}

if (import.meta.env?.DEV) {
  console.assert(
    unityHexToRgba('#00E1FFFF') === 'rgba(0,225,255,1)',
    'unityHexToRgba should parse #00E1FFFF as rgba(0,225,255,1)'
  )
}
