import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Toggle } from '../components/ui/toggle'
import { QuestSection } from '../components/QuestSection'
import type { SortKey } from '../components/QuestSection'
import { useAsync } from '../hooks/useAsync'
import { getManifest, getSiteStats } from '../lib/data'
import { useI18n } from '../lib/i18n'
import { QUEST_TYPE_ORDER } from '../lib/questType'

export const RegionPage = () => {
  const { regionKey } = useParams()
  const region = regionKey ? decodeURIComponent(regionKey) : ''
  const { t, lang, numberFormat } = useI18n()
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])
  const { data: stats } = useAsync((signal) => getSiteStats(lang, signal), [lang])
  const [sortKey, setSortKey] = useState<SortKey>('chapter')
  const [showHidden, setShowHidden] = useState(false)
  const [onlyCutscenes, setOnlyCutscenes] = useState(false)
  const [onlySubtitles, setOnlySubtitles] = useState(false)

  useEffect(() => {
    document.title = t('region.title', { region })
  }, [region, t])

  const filtered = useMemo(() => {
    return (
      manifest?.filter((quest) => {
        if (quest.region !== region) return false
        if (!showHidden && quest.hidden) return false
        if (onlyCutscenes && !quest.hasCutscenes) return false
        if (onlySubtitles && !quest.hasVideoSubtitles) return false
        return true
      }) ?? []
    )
  }, [manifest, region, showHidden, onlyCutscenes, onlySubtitles])

  const statsEntry = stats?.byRegion?.[region]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('region.heading', { region })}</h1>
          <p className="text-sm text-muted-foreground">{t('region.subheading')}</p>
        </div>
        <Badge variant="outline">
          {t('region.questCount', { count: numberFormat(filtered.length) })}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('region.statsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('region.totalQuests')}</p>
            <p className="text-lg font-semibold">
              {statsEntry ? numberFormat(statsEntry.totalQuests) : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('region.dialogLines')}</p>
            <p className="text-lg font-semibold">
              {statsEntry ? numberFormat(statsEntry.dialogLines) : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('region.narrationLines')}</p>
            <p className="text-lg font-semibold">
              {statsEntry ? numberFormat(statsEntry.narrationLines) : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('region.cutscenes')}</p>
            <p className="text-lg font-semibold">
              {statsEntry ? numberFormat(statsEntry.cutscenes) : '--'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('region.settingsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Toggle pressed={showHidden} onClick={() => setShowHidden((prev) => !prev)}>
            {t('region.showHidden')}
          </Toggle>
          <Toggle pressed={onlyCutscenes} onClick={() => setOnlyCutscenes((prev) => !prev)}>
            {t('region.onlyCutscenes')}
          </Toggle>
          <Toggle pressed={onlySubtitles} onClick={() => setOnlySubtitles((prev) => !prev)}>
            {t('region.onlySubtitles')}
          </Toggle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('region.sortLabel')}</span>
            {(['chapter', 'level', 'id', 'title'] as SortKey[]).map((key) => (
              <Toggle key={key} pressed={sortKey === key} onClick={() => setSortKey(key)}>
                {key === 'chapter' && t('region.sortChapter')}
                {key === 'level' && t('region.sortLevel')}
                {key === 'id' && 'ID'}
                {key === 'title' && t('region.sortTitle')}
              </Toggle>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {QUEST_TYPE_ORDER.map((type) => {
          const quests = filtered.filter((quest) => quest.questType === type)
          if (!quests.length) return null
          return (
            <QuestSection key={type} questType={type} quests={quests} sortKey={sortKey} region={region} />
          )
        })}
      </div>
    </div>
  )
}
