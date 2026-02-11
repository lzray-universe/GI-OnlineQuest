import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ManifestQuest, QuestTypeCode } from '../types/quest'
import { ChapterCard } from './ChapterCard'
import { useI18n } from '../lib/i18n'
import { Button } from './ui/button'
import { groupQuestsByChapter, sortChapterGroups } from '../lib/chapter'

export type SortKey = 'chapter' | 'level' | 'id' | 'title'

export const QuestSection = ({
  quests,
  questType,
  region,
  defaultOpen = true,
  sortKey,
}: {
  quests: ManifestQuest[]
  questType: QuestTypeCode
  region?: string
  defaultOpen?: boolean
  sortKey: SortKey
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const { t, questTypeLabel, numberFormat, locale } = useI18n()

  const chapters = useMemo(() => {
    const groups = groupQuestsByChapter(quests, t('chapterCard.uncategorized'))
    return sortChapterGroups(groups, sortKey, locale)
  }, [quests, sortKey, locale, t])
  const searchParams = useMemo(() => {
    const params = new URLSearchParams()
    if (questType) params.set('type', questType)
    if (region) params.set('region', region)
    return params.toString() || undefined
  }, [questType, region])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{questTypeLabel(questType)}</h2>
          <p className="text-sm text-muted-foreground">
            {t('questSection.questCount', { count: numberFormat(quests.length) })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((prev) => !prev)}>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? t('questSection.collapse') : t('questSection.expand')}
        </Button>
      </div>
      {open && (
        <div className="grid gap-4">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.chapterId} chapter={chapter} searchParams={searchParams} />
          ))}
        </div>
      )}
    </section>
  )
}
