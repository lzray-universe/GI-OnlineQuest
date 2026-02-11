import { useEffect, useMemo, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useI18n } from '../lib/i18n'
import { LANGUAGES, type LangCode } from '../lib/languages'
import {
  VOCAB_STORAGE_KEY,
  exportCSV,
  exportJSON,
  listVocab,
  toggleSave,
  type VocabEntry,
} from '../lib/vocabStorage'

export const StudyVocabPage = () => {
  const { t, locale } = useI18n()
  const [sourceLang, setSourceLang] = useState<LangCode | 'all'>('all')
  const [glossLang, setGlossLang] = useState<LangCode | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    document.title = t('study.vocabTitle')
  }, [t])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === VOCAB_STORAGE_KEY) {
        setRefreshTick((value) => value + 1)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const entries = useMemo(() => {
    return listVocab({
      sourceLang: sourceLang === 'all' ? undefined : sourceLang,
      glossLang: glossLang === 'all' ? undefined : glossLang,
      searchTerm,
    })
  }, [glossLang, refreshTick, searchTerm, sourceLang])

  const grouped = useMemo(() => {
    const groups = new Map<string, VocabEntry[]>()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterday = today - 86400000
    const formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    entries.forEach((entry) => {
      const date = new Date(entry.createdAt)
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      let label = formatter.format(date)
      if (day === today) label = t('study.vocabGroupToday')
      if (day === yesterday) label = t('study.vocabGroupYesterday')
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label)?.push(entry)
    })
    return Array.from(groups.entries())
  }, [entries, locale, t])

  const downloadFile = (content: string, fileName: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = (format: 'json' | 'csv') => {
    const date = new Date().toISOString().split('T')[0]
    if (format === 'json') {
      downloadFile(exportJSON(), `onlinequest_vocab_${date}.json`, 'application/json;charset=utf-8')
    } else {
      downloadFile(exportCSV(), `onlinequest_vocab_${date}.csv`, 'text/csv;charset=utf-8')
    }
  }

  const handleRemove = (entry: VocabEntry) => {
    toggleSave({
      term: entry.term,
      sourceLang: entry.sourceLang,
      glossLang: entry.glossLang,
      meanings: entry.meanings,
      sources: entry.sources,
    })
    setRefreshTick((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('study.vocabHeading')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="sourceLang">
                {t('study.vocabSourceLang')}
              </label>
              <select
                id="sourceLang"
                value={sourceLang}
                onChange={(event) => setSourceLang(event.target.value as LangCode | 'all')}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="all">{t('study.vocabAll')}</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="glossLang">
                {t('study.vocabGlossLang')}
              </label>
              <select
                id="glossLang"
                value={glossLang}
                onChange={(event) => setGlossLang(event.target.value as LangCode | 'all')}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="all">{t('study.vocabAll')}</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="vocabSearch">
                {t('study.vocabSearch')}
              </label>
              <Input
                id="vocabSearch"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('study.vocabSearchPlaceholder')}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleExport('json')}>
              <Download className="h-4 w-4" /> {t('study.vocabExportJson')}
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4" /> {t('study.vocabExportCsv')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {grouped.length ? (
        grouped.map(([label, group]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">{entry.term}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.sourceLang.toUpperCase()} → {entry.glossLang.toUpperCase()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(entry)}>
                      <Trash2 className="h-4 w-4" /> {t('study.vocabRemove')}
                    </Button>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {entry.meanings.length ? (
                      entry.meanings.map((meaning, index) => <li key={index}>{meaning}</li>)
                    ) : (
                      <li>{t('study.lookupEmpty')}</li>
                    )}
                  </ul>
                  {entry.sources.length ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">{t('study.vocabSources')}</p>
                      {entry.sources.map((source, index) => (
                        <p key={index}>
                          {t('study.lookupQuestId', { id: source.questId })}
                          {source.nodeId != null && ` · ${t('study.lookupNodeId', { id: source.nodeId })}`}
                          {source.subQuestId != null &&
                            ` · ${t('study.lookupSubQuestId', { id: source.subQuestId })}`}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t('study.vocabEmpty')}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
