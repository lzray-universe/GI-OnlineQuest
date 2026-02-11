import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Toggle } from '../components/ui/toggle'
import { useAsync } from '../hooks/useAsync'
import { getManifest } from '../lib/data'
import { useI18n } from '../lib/i18n'
import { LANGUAGES, type LangCode } from '../lib/languages'
import { cn } from '../lib/utils'
import type { ManifestQuest } from '../types/quest'

const normalizeCompareLangs = (langs: LangCode[], mainLang: LangCode) => {
  const filtered = langs.filter((lang) => lang !== mainLang)
  if (filtered.length) return filtered
  const fallback = LANGUAGES.find((lang) => lang.code !== mainLang)?.code
  return fallback ? [fallback] : []
}

const arraysEqual = (left: LangCode[], right: LangCode[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

export const StudyHomePage = () => {
  const { t, lang, withLang } = useI18n()
  const navigate = useNavigate()
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])
  const [mainLang, setMainLang] = useState<LangCode>(lang)
  const [compareLangs, setCompareLangs] = useState<LangCode[]>(() =>
    normalizeCompareLangs([], lang)
  )
  const [questIdInput, setQuestIdInput] = useState('')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    document.title = t('study.title')
  }, [t])

  useEffect(() => {
    setCompareLangs((prev) => {
      const normalized = normalizeCompareLangs(prev, mainLang)
      return arraysEqual(prev, normalized) ? prev : normalized
    })
  }, [mainLang])

  const selectedLangs = useMemo(() => {
    const combined = [mainLang, ...normalizeCompareLangs(compareLangs, mainLang)]
    return Array.from(new Set(combined))
  }, [compareLangs, mainLang])

  const questId = Number.parseInt(questIdInput, 10)
  const hasValidQuestId = Number.isFinite(questId) && questId > 0

  const searchResults = useMemo(() => {
    if (!manifest || !searchText.trim()) return []
    const query = searchText.trim().toLowerCase()
    return manifest.filter((quest) => quest.title.toLowerCase().includes(query)).slice(0, 8)
  }, [manifest, searchText])

  const onEnter = () => {
    if (!hasValidQuestId) return
    const params = new URLSearchParams()
    params.set('main', mainLang)
    params.set('langs', selectedLangs.join(','))
    navigate(withLang(`/study/quest/${questId}?${params.toString()}`))
  }

  const toggleCompareLang = (code: LangCode) => {
    setCompareLangs((prev) =>
      prev.includes(code) ? prev.filter((lang) => lang !== code) : [...prev, code]
    )
  }

  const setQuestFromResult = (quest: ManifestQuest) => {
    setQuestIdInput(String(quest.id))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">{t('study.heading')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('study.subheading')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('study.languageTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">{t('study.mainLang')}</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((option) => (
                <Toggle
                  key={option.code}
                  pressed={mainLang === option.code}
                  onClick={() => setMainLang(option.code)}
                >
                  {option.displayName}
                </Toggle>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">{t('study.compareLangs')}</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.filter((option) => option.code !== mainLang).map((option) => (
                <Toggle
                  key={option.code}
                  pressed={compareLangs.includes(option.code)}
                  onClick={() => toggleCompareLang(option.code)}
                >
                  {option.displayName}
                </Toggle>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('study.compareHint')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('study.questSelection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">{t('study.questIdLabel')}</p>
              <Input
                value={questIdInput}
                onChange={(event) => setQuestIdInput(event.target.value)}
                placeholder={t('study.questIdPlaceholder')}
              />
            </div>
            <Button onClick={onEnter} disabled={!hasValidQuestId}>
              {t('study.enterStudy')}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">{t('study.searchLabel')}</p>
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={t('study.searchPlaceholder')}
              />
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Search className="h-4 w-4" /> {t('study.resultsTitle')}
              </div>
              <div className="mt-3 space-y-2">
                {searchResults.length ? (
                  searchResults.map((quest) => (
                    <button
                      key={quest.id}
                      type="button"
                      onClick={() => setQuestFromResult(quest)}
                      className={cn(
                        'w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors',
                        questIdInput === String(quest.id)
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted'
                      )}
                    >
                      <p className="font-semibold">{quest.title}</p>
                      <p className="text-xs text-muted-foreground">#{quest.id}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('study.noResults')}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
