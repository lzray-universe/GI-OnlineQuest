import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const getAssetUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const normalized = path.replace(/^\//, '')
  if (typeof window === 'undefined') {
    return `${import.meta.env.BASE_URL}${normalized}`
  }
  const base = new URL('./', window.location.href)
  return new URL(normalized, base).toString()
}

export const formatNumber = (value: number, locale = 'zh-CN') => {
  return new Intl.NumberFormat(locale).format(value)
}

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}
