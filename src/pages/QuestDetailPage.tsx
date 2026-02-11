import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Clipboard,
  FileJson,
  MessageCircle,
  PlayCircle,
  ScrollText,
  Star,
} from 'lucide-react'
import { QuestJsonReader } from '../components/QuestJsonReader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAsync } from '../hooks/useAsync'
import { getManifest, getQuestData, getSubtitleText } from '../lib/data'
import { useI18n } from '../lib/i18n'
import { QUEST_TYPE_COLORS } from '../lib/questType'
import { addRecent, getFavorites, toggleFavorite } from '../lib/storage'
import { parseSrt } from '../lib/srt'
import { formatNumber, getAssetUrl } from '../lib/utils'
import { formatGameTextPlain, renderGameText } from '../lib/gameText'
import { usePlayerTextSettings } from '../lib/playerTextSettings'
import type { ManifestQuest } from '../types/quest'

const renderJson = (value: unknown) => JSON.stringify(value, null, 2)

export const QuestDetailPage = () => {
  const { id } = useParams()
  const questId = Number(id)
  const { t, lang, withLang, questTypeLabel, locale } = useI18n()
  const { settings } = usePlayerTextSettings()
  const formatText = useMemo(() => (value: string) => formatGameTextPlain(value, settings), [settings])
  const renderText = useMemo(() => (value: string) => renderGameText(value, settings), [settings])
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])
  const { data: quest } = useAsync((signal) => getQuestData(questId, lang, signal), [questId, lang])
  const questMeta = manifest?.find((item) => item.id === questId)
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('readable')
  const [favorites, setFavorites] = useState(() => getFavorites())
  const [dialogFilter, setDialogFilter] = useState('')
  const [dialogSearch, setDialogSearch] = useState('')

  useEffect(() => {
    const fallbackTitle = t('common.questFallback', { id: questId })
    document.title = `${questMeta?.title ?? fallbackTitle} · OnlineQuest`
    if (questId) {
      addRecent(questId)
    }
  }, [questMeta?.title, questId, t])

  const dialogEntries = useMemo(() => {
    const entries: Array<{
      subQuestId: number
      order: number
      dialog: { speakerName?: string | null; text: string; roleType?: string; speakerId?: number | null }
    }> = []

    quest?.flow?.forEach((flow) => {
      flow.talks?.forEach((talk) => {
        talk.dialogs?.forEach((dialog) => {
          entries.push({
            subQuestId: flow.subQuestId,
            order: flow.order,
            dialog,
          })
        })
      })
    })

    return entries
  }, [quest])

  const formattedEntries = useMemo(() => {
    const formatText = (value: string) => formatGameTextPlain(value, settings)
    return dialogEntries.map((entry) => ({
      ...entry,
      dialog: {
        ...entry.dialog,
        speakerNamePlain: entry.dialog.speakerName ? formatText(entry.dialog.speakerName) : entry.dialog.speakerName,
        textPlain: formatText(entry.dialog.text),
      },
    }))
  }, [dialogEntries, settings])

  const speakers = useMemo(() => {
    const names = new Set<string>()
    formattedEntries.forEach((entry) => {
      const name = entry.dialog.speakerNamePlain
      if (name) names.add(name)
    })
    return Array.from(names)
  }, [formattedEntries])

  const filteredDialogs = formattedEntries.filter((entry) => {
    if (dialogFilter && entry.dialog.speakerNamePlain !== dialogFilter) return false
    if (dialogSearch && !entry.dialog.textPlain.includes(dialogSearch)) return false
    return true
  })

  const highlightSpeakerId = searchParams.get('speakerId')

  const linkedQuests = useMemo(() => {
    if (!manifest || !questMeta) return { pre: [], next: [] }
    const byId = new Map(manifest.map((item) => [item.id, item]))
    const pre = questMeta.preMainQuestIds.map((qid) => byId.get(qid)).filter(Boolean) as ManifestQuest[]
    const next = questMeta.nextMainQuestIds.map((qid) => byId.get(qid)).filter(Boolean) as ManifestQuest[]
    return { pre, next }
  }, [manifest, questMeta])

  const isFavorite = favorites.includes(questId)

  const copyJson = async (payload: unknown) => {
    await navigator.clipboard.writeText(renderJson(payload))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to={withLang('/quests')} className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> {t('quest.backToList')}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">
            {questMeta?.title ?? t('common.questFallback', { id: questId })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{questMeta?.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {questMeta && (
            <Badge className={QUEST_TYPE_COLORS[questMeta.questType]}>
              {questMeta.questTypeLabel} · {questMeta.questType}
            </Badge>
          )}
          {questMeta?.hidden && <Badge variant="secondary">{t('quest.hidden')}</Badge>}
          <Button
            variant={isFavorite ? 'default' : 'outline'}
            onClick={() => setFavorites(toggleFavorite(questId))}
          >
            <Star className="h-4 w-4" /> {isFavorite ? t('quest.favorited') : t('quest.favorite')}
          </Button>
          <Button asChild variant="outline">
            <Link to={withLang(`/quest/${questId}/reader`)}>
              <BookOpen className="h-4 w-4" /> {t('quest.readerMode')}
            </Link>
          </Button>
        </div>
      </div>

      {questMeta && (
        <div className="text-sm text-muted-foreground">
          <Link to={withLang(`/region/${encodeURIComponent(questMeta.region)}`)}>
            {questMeta.region}
          </Link>
          <span className="mx-2">/</span>
          <Link to={withLang(`/type/${questMeta.questType}`)}>
            {questMeta.questTypeLabel || questTypeLabel(questMeta.questType)}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{questMeta.title}</span>
        </div>
      )}

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-6">
          <div>
            <p className="text-xs text-muted-foreground">{t('quest.region')}</p>
            <p className="text-sm font-semibold">{questMeta?.region ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('quest.chapter')}</p>
            <p className="text-sm font-semibold">{questMeta?.chapterTitle ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('quest.recommendLevel')}</p>
            <p className="text-sm font-semibold">{questMeta?.recommendLevel ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('quest.dialogCount')}</p>
            <p className="text-sm font-semibold">
              {formatNumber(questMeta?.dialogCount ?? 0, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('quest.needLevel')}</p>
            <p className="text-sm font-semibold">{questMeta?.needPlayerLevel ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('quest.cutscenes')}</p>
            <p className="text-sm font-semibold">
              {questMeta?.hasCutscenes ? t('quest.cutscenesYes') : t('quest.cutscenesNo')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('quest.preQuests')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedQuests.pre.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('quest.noPreQuests')}</p>
            )}
            {linkedQuests.pre.map((questItem) => (
              <Link
                key={questItem.id}
                to={withLang(`/quest/${questItem.id}`)}
                className="block rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                {questItem.title}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('quest.nextQuests')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedQuests.next.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('quest.noNextQuests')}</p>
            )}
            {linkedQuests.next.map((questItem) => (
              <Link
                key={questItem.id}
                to={withLang(`/quest/${questItem.id}`)}
                className="block rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                {questItem.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs>
        <TabsList>
          {[
            { id: 'readable', label: t('quest.tabs.readable'), icon: ScrollText },
            { id: 'dialogs', label: t('quest.tabs.dialogs'), icon: MessageCircle },
            { id: 'flow', label: t('quest.tabs.flow'), icon: BookOpen },
            { id: 'narration', label: t('quest.tabs.narration'), icon: MessageCircle },
            { id: 'cutscenes', label: t('quest.tabs.cutscenes'), icon: PlayCircle },
            { id: 'rewards', label: t('quest.tabs.rewards'), icon: Star },
            { id: 'raw', label: t('quest.tabs.raw'), icon: FileJson },
          ].map((tab) => (
            <TabsTrigger key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab === 'readable' && (
          <TabsContent>
            <Card>
              <CardContent className="max-w-none p-6">
                {quest ? (
                  <QuestJsonReader quest={quest ?? undefined} questMeta={questMeta} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('quest.noQuestData')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'dialogs' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('quest.dialogBrowse')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <ToggleButton
                    label={t('quest.allSpeakers')}
                    active={!dialogFilter}
                    onClick={() => setDialogFilter('')}
                  />
                  {speakers.map((speaker) => (
                    <ToggleButton
                      key={speaker}
                      label={speaker}
                      active={dialogFilter === speaker}
                      onClick={() => setDialogFilter(speaker)}
                    />
                  ))}
                </div>
                <Input
                  placeholder={t('quest.searchDialogPlaceholder')}
                  value={dialogSearch}
                  onChange={(event) => setDialogSearch(event.target.value)}
                />
                <div className="space-y-4">
                  {filteredDialogs.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('quest.noDialogMatch')}</p>
                  )}
                  {filteredDialogs.map((entry, index) => {
                    const highlight =
                      highlightSpeakerId && String(entry.dialog.speakerId) === highlightSpeakerId
                    return (
                      <div
                        key={`${entry.subQuestId}-${entry.order}-${index}`}
                        className={`rounded-xl border border-border p-4 ${highlight ? 'bg-primary/10' : ''}`}
                      >
                        <p className="text-xs text-muted-foreground">
                          {t('reader.stepLabel', {
                            step: entry.order,
                            subQuestId: entry.subQuestId,
                          })}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {entry.dialog.speakerNamePlain ?? t('reader.speakerFallback')}
                        </p>
                        <p className="mt-1 text-sm text-foreground/90">
                          {renderText(entry.dialog.text)}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {quest?.unmappedTalks?.length ? (
                  <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-semibold">{t('quest.unmappedDialogs')}</p>
                    <pre className="mt-2 overflow-auto text-xs">{renderJson(quest.unmappedTalks)}</pre>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'flow' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('quest.flowTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quest?.flow?.map((flow) => (
                  <div key={flow.subQuestId} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {t('reader.stepHeader', {
                          subQuestId: flow.subQuestId,
                          step: flow.order,
                        })}
                      </p>
                      <Badge variant={flow.isHidden ? 'secondary' : 'outline'}>
                        {flow.isHidden ? t('quest.flowHidden') : t('quest.flowPublic')}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Step {flow.order}: {flow.stepDescription}
                    </p>
                    {flow.conditions && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          {t('quest.conditionDetails')}
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">
                          {renderJson(flow.conditions)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'narration' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('quest.narrationTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quest?.questNarration?.length ? (
                  quest.questNarration.map((line, index) => (
                    <div key={index} className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">
                        {line.speakerName ? formatText(line.speakerName) : t('quest.tabs.narration')}
                      </p>
                      <p className="mt-1 text-sm">{renderText(line.text)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('quest.noNarration')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'cutscenes' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('quest.cutscenesTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quest?.cutscenes?.length ? (
                  quest.cutscenes.map((scene, index) => (
                    <CutsceneCard key={index} scene={scene} index={index} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('quest.noCutscenes')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'rewards' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('quest.rewardsTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                {quest?.meta?.rewards ? (
                  <pre className="rounded-xl bg-muted p-4 text-xs">
                    {renderJson(quest.meta.rewards)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('quest.noRewards')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'raw' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('quest.rawTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={() => copyJson(quest)}>
                  <Clipboard className="h-4 w-4" /> {t('quest.copyJson')}
                </Button>
                <pre className="rounded-xl bg-muted p-4 text-xs">
                  {renderJson(quest)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

const ToggleButton = ({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) => (
  <Button variant={active ? 'default' : 'outline'} size="sm" onClick={onClick}>
    {label}
  </Button>
)

const CutsceneCard = ({ scene, index }: { scene: any; index: number }) => {
  const { t, lang } = useI18n()
  const subtitlePath = scene.subtitleCHS?.primary || scene.subtitleCHS?.other
  const { data: subtitleText } = useAsync(
    (signal) => (subtitlePath ? getSubtitleText(subtitlePath, lang, signal) : Promise.resolve('')),
    [subtitlePath, lang]
  )
  const srtEntries = subtitleText ? parseSrt(subtitleText).slice(0, 10) : []
  const dataBase = lang === 'zh' ? 'data' : `data/${lang}`

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm font-semibold">
        {scene.kind ?? 'cutscene'} · {scene.cutsceneId ?? index}
      </p>
      <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 text-xs">{renderJson(scene)}</pre>
      {subtitlePath && (
        <div className="mt-3 space-y-2">
          <a
            href={getAssetUrl(`${dataBase}/subtitles/${subtitlePath}`)}
            className="text-sm"
            target="_blank"
            rel="noreferrer"
          >
            {t('quest.downloadSubtitle')}
          </a>
          {srtEntries.length > 0 && (
            <div className="space-y-2">
              {srtEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border p-2 text-xs">
                  <p className="text-muted-foreground">
                    {entry.start} → {entry.end}
                  </p>
                  <p className="mt-1">{entry.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
