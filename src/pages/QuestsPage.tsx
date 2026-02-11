import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Filter, Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Toggle } from '../components/ui/toggle'
import { ChapterCard } from '../components/ChapterCard'
import { useAsync } from '../hooks/useAsync'
import { groupQuestsByChapter, sortChapterGroups } from '../lib/chapter'
import { getIndexes, getManifest } from '../lib/data'
import { useI18n } from '../lib/i18n'
import { QUEST_TYPE_ORDER } from '../lib/questType'
import type { ManifestQuest, QuestTypeCode } from '../types/quest'

const useSearchWorker = (manifest: ManifestQuest[] | null) => {
  const [results, setResults] = useState<number[]>([])
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    if (!manifest) return
    const worker = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    worker.postMessage({ type: 'index', payload: manifest })
    worker.onmessage = (event) => {
      if (event.data.type === 'results') {
        setResults(event.data.payload as number[])
      }
    }
    return () => worker.terminate()
  }, [manifest])

  const query = useCallback((value: string) => {
    workerRef.current?.postMessage({ type: 'query', payload: { query: value } })
  }, [])

  return { results, query }
}

const parseList = (value: string | null) => (value ? value.split(',').filter(Boolean) : [])

export const QuestsPage = () => {
  const { t, lang, questTypeLabel, numberFormat, locale } = useI18n()
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])
  const { data: indexes } = useAsync((signal) => getIndexes(lang, signal), [lang])
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')
  const [showFilters, setShowFilters] = useState(true)

  useEffect(() => {
    document.title = t('quests.title')
  }, [t])

  const { results, query } = useSearchWorker(manifest ?? null)

  useEffect(() => {
    query(searchText)
  }, [query, searchText])

  const selectedRegions = parseList(searchParams.get('regions'))
  const selectedTypes = parseList(searchParams.get('types')) as QuestTypeCode[]
  const showHidden = searchParams.get('hidden') === '1'
  const filterCutscene = searchParams.get('cutscene') === '1'
  const filterSubtitle = searchParams.get('subtitle') === '1'
  const favoritesOnly = searchParams.get('favorites') === '1'
  const chapterQuery = searchParams.get('chapter') ?? ''
  const levelMin = Number(searchParams.get('levelMin') || '0')
  const levelMax = Number(searchParams.get('levelMax') || '0')

  const filtered = useMemo(() => {
    if (!manifest) return []
    const favorites = favoritesOnly
      ? new Set(JSON.parse(localStorage.getItem('onlinequest_favorites') || '[]') as number[])
      : null

    return manifest.filter((quest) => {
      if (selectedRegions.length && !selectedRegions.includes(quest.region)) return false
      if (selectedTypes.length && !selectedTypes.includes(quest.questType)) return false
      if (!showHidden && quest.hidden) return false
      if (filterCutscene && !quest.hasCutscenes) return false
      if (filterSubtitle && !quest.hasVideoSubtitles) return false
      if (favorites && !favorites.has(quest.id)) return false
      if (chapterQuery && !quest.chapterTitle.includes(chapterQuery)) return false
      if (levelMin && quest.recommendLevel < levelMin) return false
      if (levelMax && quest.recommendLevel > levelMax) return false
      if (searchText) {
        if (!results.length) return false
        if (!results.includes(quest.id)) return false
      }
      return true
    })
  }, [
    manifest,
    selectedRegions,
    selectedTypes,
    showHidden,
    filterCutscene,
    filterSubtitle,
    favoritesOnly,
    searchText,
    results,
    chapterQuery,
    levelMin,
    levelMax,
  ])

  const parentRef = useRef<HTMLDivElement | null>(null)
  const chapters = useMemo(() => {
    const groups = groupQuestsByChapter(filtered, t('chapterCard.uncategorized'))
    return sortChapterGroups(groups, 'chapter', locale)
  }, [filtered, locale, t])
  const rowVirtualizer = useVirtualizer({
    count: chapters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 8,
  })

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    setSearchParams(next)
  }

  const toggleMulti = (key: string, value: string) => {
    const current = new Set(parseList(searchParams.get(key)))
    if (current.has(value)) {
      current.delete(value)
    } else {
      current.add(value)
    }
    updateParam(key, Array.from(current).join(','))
  }

  const toggleBoolean = (key: string) => {
    updateParam(key, searchParams.get(key) === '1' ? null : '1')
  }

  useEffect(() => {
    if (searchText) {
      updateParam('q', searchText)
    } else {
      updateParam('q', null)
    }
  }, [searchText])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('quests.heading')}</h1>
          <p className="text-sm text-muted-foreground">{t('quests.subheading')}</p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
          <Filter className="h-4 w-4" />{' '}
          {showFilters ? t('quests.collapseFilters') : t('quests.toggleFilters')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> {t('quests.keywordSearch')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t('quests.keywordPlaceholder')}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </CardContent>
      </Card>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>{t('quests.filtersTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('quests.regionLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {indexes &&
                  Object.keys(indexes.counts.regions).map((region) => (
                    <Toggle
                      key={region}
                      pressed={selectedRegions.includes(region)}
                      onClick={() => toggleMulti('regions', region)}
                    >
                      {region}
                    </Toggle>
                  ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('quests.typeLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                {QUEST_TYPE_ORDER.map((type) => (
                  <Toggle
                    key={type}
                    pressed={selectedTypes.includes(type)}
                    onClick={() => toggleMulti('types', type)}
                  >
                    {questTypeLabel(type)}
                  </Toggle>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('quests.advancedLabel')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Toggle pressed={showHidden} onClick={() => toggleBoolean('hidden')}>
                  {t('quests.showHidden')}
                </Toggle>
                <Toggle pressed={filterCutscene} onClick={() => toggleBoolean('cutscene')}>
                  {t('quests.onlyCutscenes')}
                </Toggle>
                <Toggle pressed={filterSubtitle} onClick={() => toggleBoolean('subtitle')}>
                  {t('quests.onlySubtitles')}
                </Toggle>
                <Toggle pressed={favoritesOnly} onClick={() => toggleBoolean('favorites')}>
                  {t('quests.onlyFavorites')}
                </Toggle>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('quests.chapterLevel')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder={t('quests.chapterPlaceholder')}
                  value={chapterQuery}
                  onChange={(event) => updateParam('chapter', event.target.value || null)}
                />
                <Input
                  type="number"
                  placeholder={t('quests.levelMinPlaceholder')}
                  value={levelMin || ''}
                  onChange={(event) => updateParam('levelMin', event.target.value || null)}
                  className="w-32"
                />
                <Input
                  type="number"
                  placeholder={t('quests.levelMaxPlaceholder')}
                  value={levelMax || ''}
                  onChange={(event) => updateParam('levelMax', event.target.value || null)}
                  className="w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        {t('quests.resultSummary', {
          count: numberFormat(filtered.length),
          chapters: numberFormat(chapters.length),
        })}
      </div>

      <div
        ref={parentRef}
        className="h-[70vh] overflow-auto rounded-2xl border border-border bg-card p-4 scrollbar-thin"
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const chapter = chapters[virtualRow.index]
            return (
              <div
                key={chapter.chapterId}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="pb-4">
                  <ChapterCard chapter={chapter} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
