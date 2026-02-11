import { useEffect, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { QuestCard } from '../components/QuestCard'
import { useAsync } from '../hooks/useAsync'
import { getManifest } from '../lib/data'
import { useI18n } from '../lib/i18n'
import type { ManifestQuest } from '../types/quest'

export const ChapterPage = () => {
  const { chapterId } = useParams()
  const [searchParams] = useSearchParams()
  const chapterKey = Number(chapterId)
  const typeFilter = searchParams.get('type')
  const regionFilter = searchParams.get('region')
  const { t, lang, withLang, numberFormat, questTypeLabel } = useI18n()
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])

  const filtered = useMemo(() => {
    return (
      manifest?.filter((quest) => {
        if (quest.chapterId !== chapterKey) return false
        if (typeFilter && quest.questType !== typeFilter) return false
        if (regionFilter && quest.region !== regionFilter) return false
        return true
      }) ?? []
    )
  }, [manifest, chapterKey, typeFilter, regionFilter])

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => a.id - b.id),
    [filtered]
  )

  const chapterMeta = useMemo<ManifestQuest | undefined>(
    () => filtered.find((quest) => quest.chapterNum || quest.chapterTitle),
    [filtered]
  )

  const title = chapterMeta?.chapterNum || t('chapter.title')

  useEffect(() => {
    document.title = `${title} · OnlineQuest`
  }, [title])

  const backLink = withLang(
    regionFilter
      ? `/region/${encodeURIComponent(regionFilter)}`
      : typeFilter
        ? `/type/${encodeURIComponent(typeFilter)}`
        : '/quests'
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to={backLink} className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> {t('chapter.backToChapters')}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {chapterMeta?.chapterTitle || t('chapterCard.unnamed')}{' '}
            {typeFilter ? `· ${questTypeLabel(typeFilter)}` : ''}
          </p>
        </div>
        <Badge variant="outline">
          {t('common.questsCount', { count: numberFormat(sorted.length) })}
        </Badge>
      </div>

      <div className="grid gap-4">
        {sorted.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>
    </div>
  )
}
