export type LangCode = 'zh' | 'en' | 'ja'

export type LanguageConfig = {
  code: LangCode
  displayName: string
  locale: string
  dataPath: string
  generatedPath: string
  defaultRegion: string
  uncategorizedRegion: string
  regionKeywords: string[]
  questTypeLabels: Record<string, string>
  unknownSpeaker: string
}

export const LANGUAGES: LanguageConfig[] = [
  {
    code: 'zh',
    displayName: '中文',
    locale: 'zh-Hans-CN',
    dataPath: '',
    generatedPath: '',
    defaultRegion: '蒙德',
    uncategorizedRegion: '未分类',
    regionKeywords: ['蒙德', '璃月', '稻妻', '须弥', '枫丹', '纳塔', '挪德卡莱'],
    questTypeLabels: {
      WQ: '世界任务',
      AQ: '魔神任务',
      LQ: '传说任务',
      IQ: '间章任务',
      EQ: '活动任务',
    },
    unknownSpeaker: '未知角色',
  },
  {
    code: 'en',
    displayName: 'English',
    locale: 'en-US',
    dataPath: 'en',
    generatedPath: 'en',
    defaultRegion: 'Mondstadt',
    uncategorizedRegion: 'Uncategorized',
    regionKeywords: ['Mondstadt', 'Liyue', 'Inazuma', 'Sumeru', 'Fontaine', 'Natlan', 'Snezhnaya'],
    questTypeLabels: {
      WQ: 'World Quest',
      AQ: 'Archon Quest',
      LQ: 'Story Quest',
      IQ: 'Interlude Quest',
      EQ: 'Event Quest',
    },
    unknownSpeaker: 'Unknown',
  },
  {
    code: 'ja',
    displayName: '日本語',
    locale: 'ja-JP',
    dataPath: 'ja',
    generatedPath: 'ja',
    defaultRegion: 'モンド',
    uncategorizedRegion: '未分類',
    regionKeywords: ['モンド', '璃月', '稲妻', 'スメール', 'フォンテーヌ', 'ナタ', 'スネージナヤ'],
    questTypeLabels: {
      WQ: '世界任務',
      AQ: '魔神任務',
      LQ: '伝説任務',
      IQ: '間章任務',
      EQ: 'イベント任務',
    },
    unknownSpeaker: '不明',
  },
]

export const DEFAULT_LANG: LangCode = 'zh'

export const getLanguageConfig = (code: LangCode) => {
  return LANGUAGES.find((lang) => lang.code === code) ?? LANGUAGES[0]
}

export const getLangFromPath = (pathname: string): LangCode => {
  if (pathname.startsWith('/en')) return 'en'
  if (pathname.startsWith('/ja')) return 'ja'
  return 'zh'
}

export const stripLangPrefix = (pathname: string) => {
  if (pathname.startsWith('/en/')) return pathname.replace('/en', '')
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/ja/')) return pathname.replace('/ja', '')
  if (pathname === '/ja') return '/'
  return pathname
}

export const buildPathWithLang = (path: string, lang: LangCode) => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const stripped = stripLangPrefix(normalized)
  if (lang === 'zh') return stripped
  if (stripped === '/') return `/${lang}`
  return `/${lang}${stripped}`
}

export const getQuestTypeLabel = (lang: LangCode, questType: string) => {
  const config = getLanguageConfig(lang)
  return config.questTypeLabels[questType] ?? questType
}
