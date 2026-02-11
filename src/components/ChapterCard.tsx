import { Link } from 'react-router-dom'
import type { ChapterGroup } from '../lib/chapter'
import { Badge } from './ui/badge'
import { useI18n } from '../lib/i18n'

const buildLink = (chapterId: number, searchParams?: string) => {
  if (!searchParams) return `/chapter/${chapterId}`
  return `/chapter/${chapterId}?${searchParams}`
}

export const ChapterCard = ({
  chapter,
  searchParams,
}: {
  chapter: ChapterGroup
  searchParams?: string
}) => {
  const { t, withLang, numberFormat } = useI18n()
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            to={withLang(buildLink(chapter.chapterId, searchParams))}
            className="text-base font-semibold"
          >
            {chapter.chapterNum || t('chapterCard.uncategorized')}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {chapter.chapterTitle || t('chapterCard.unnamed')}
          </p>
        </div>
        <Badge variant="secondary">
          {t('chapterCard.questCount', { count: numberFormat(chapter.quests.length) })}
        </Badge>
      </div>
    </div>
  )
}
