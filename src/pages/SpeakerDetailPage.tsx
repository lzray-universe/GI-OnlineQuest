import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useAsync } from '../hooks/useAsync'
import { getSpeakersIndex } from '../lib/data'
import { useI18n } from '../lib/i18n'
import type { SpeakerTaskSummary } from '../types/speakers'

export const SpeakerDetailPage = () => {
  const { speakerId } = useParams()
  const id = speakerId ?? ''
  const { t, lang, withLang, numberFormat, questTypeLabel } = useI18n()
  const { data: speakersIndex, error } = useAsync(
    (signal) => getSpeakersIndex(lang, signal),
    [lang]
  )

  useEffect(() => {
    document.title = t('speakerDetail.title', { id: speakerId ?? '' })
  }, [speakerId, t])

  const quests = useMemo(() => {
    if (!speakersIndex) return []
    const questIds = speakersIndex.speakerById?.[String(id)]?.taskIds ?? []
    return questIds
      .map((questId) => speakersIndex.taskSummaryById[String(questId)])
      .filter((quest): quest is SpeakerTaskSummary => Boolean(quest))
  }, [speakersIndex, id])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof quests>()
    quests.forEach((quest) => {
      const key = `${quest.region} / ${quest.questTypeLabel || questTypeLabel(quest.questType)}`
      const list = map.get(key) ?? []
      list.push(quest)
      map.set(key, list)
    })
    return Array.from(map.entries())
  }, [questTypeLabel, quests])

  const speakerName = speakersIndex?.speakerById?.[String(id)]?.name

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {speakerName ?? t('speakerDetail.unknownSpeaker')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('speakerDetail.speakerId', { id: speakerId ?? '' })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('speakerDetail.questsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-sm text-destructive">{t('speakerDetail.loadError')}</div>
          ) : null}
          {grouped.map(([group, items]) => (
            <div key={group} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{group}</p>
                <Badge variant="secondary">
                  {t('speakerDetail.questCount', { count: numberFormat(items.length) })}
                </Badge>
              </div>
              <div className="grid gap-2">
                {items.map((quest) => (
                  <Link
                    key={quest.id}
                    to={withLang(`/quest/${quest.id}?speakerId=${speakerId}`)}
                    className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted"
                  >
                    <p className="font-medium">{quest.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {quest.region} · {quest.questTypeLabel || questTypeLabel(quest.questType)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
