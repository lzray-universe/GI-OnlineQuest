import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Toggle } from '../components/ui/toggle'
import { QuestSection } from '../components/QuestSection'
import type { SortKey } from '../components/QuestSection'
import { useAsync } from '../hooks/useAsync'
import { getManifest } from '../lib/data'
import { useI18n } from '../lib/i18n'
import type { QuestTypeCode } from '../types/quest'

export const TypePage = () => {
  const { questType } = useParams()
  const type = (questType ?? 'WQ') as QuestTypeCode
  const { t, lang, questTypeLabel, numberFormat } = useI18n()
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])
  const [sortKey, setSortKey] = useState<SortKey>('chapter')
  const [showHidden, setShowHidden] = useState(false)
  const [onlyCutscenes, setOnlyCutscenes] = useState(false)
  const [onlySubtitles, setOnlySubtitles] = useState(false)

  useEffect(() => {
    document.title = t('type.title', { typeLabel: questTypeLabel(type) })
  }, [questTypeLabel, t, type])

  const filtered = useMemo(() => {
    return (
      manifest?.filter((quest) => {
        if (quest.questType !== type) return false
        if (!showHidden && quest.hidden) return false
        if (onlyCutscenes && !quest.hasCutscenes) return false
        if (onlySubtitles && !quest.hasVideoSubtitles) return false
        return true
      }) ?? []
    )
  }, [manifest, type, showHidden, onlyCutscenes, onlySubtitles])

  const regions = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    filtered.forEach((quest) => {
      const list = map.get(quest.region) ?? []
      list.push(quest)
      map.set(quest.region, list)
    })
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {t('type.heading', { typeLabel: questTypeLabel(type) })}
          </h1>
          <p className="text-sm text-muted-foreground">{t('type.subheading')}</p>
        </div>
        <Badge variant="outline">
          {t('type.questCount', { count: numberFormat(filtered.length) })}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('type.settingsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Toggle pressed={showHidden} onClick={() => setShowHidden((prev) => !prev)}>
            {t('type.showHidden')}
          </Toggle>
          <Toggle pressed={onlyCutscenes} onClick={() => setOnlyCutscenes((prev) => !prev)}>
            {t('type.onlyCutscenes')}
          </Toggle>
          <Toggle pressed={onlySubtitles} onClick={() => setOnlySubtitles((prev) => !prev)}>
            {t('type.onlySubtitles')}
          </Toggle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('type.sortLabel')}</span>
            {(['chapter', 'level', 'id', 'title'] as SortKey[]).map((key) => (
              <Toggle key={key} pressed={sortKey === key} onClick={() => setSortKey(key)}>
                {key === 'chapter' && t('type.sortChapter')}
                {key === 'level' && t('type.sortLevel')}
                {key === 'id' && 'ID'}
                {key === 'title' && t('type.sortTitle')}
              </Toggle>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {regions.map(([region, quests]) => (
          <div key={region} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{region}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('type.questCount', { count: numberFormat(quests.length) })}
                </p>
              </div>
              <Badge variant="secondary">{region}</Badge>
            </div>
            <QuestSection questType={type} quests={quests} sortKey={sortKey} region={region} />
          </div>
        ))}
      </div>
    </div>
  )
}
