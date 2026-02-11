import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Pause, Play } from 'lucide-react'
import { buildTalkRenderSegments, type DialogueLine } from '../lib/talkGraph'
import { formatGameTextPlain, renderGameText } from '../lib/gameText'
import { usePlayerTextSettings } from '../lib/playerTextSettings'
import type { ManifestQuest, QuestData } from '../types/quest'
import { cn, formatNumber } from '../lib/utils'
import { useI18n } from '../lib/i18n'
import { useAsync } from '../hooks/useAsync'
import { getQuestVoiceIndex } from '../lib/data'
import { buildVoiceCandidates } from '../lib/voice'
import { QuestConditionDetails } from './QuestConditionDetails'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

type QuestJsonReaderProps = {
  quest?: QuestData
  questMeta?: ManifestQuest
  className?: string
  contentClassName?: string
  style?: CSSProperties
}

type CutsceneData = {
  cutsceneId?: number | string
  kind?: string
  resPath?: string
  fadeInDuration?: number
  fadeOutDuration?: number
  [key: string]: unknown
}

const getCutsceneId = (scene: CutsceneData) => {
  const id = Number(scene.cutsceneId)
  return Number.isFinite(id) ? id : undefined
}

type FlowStep = NonNullable<QuestData['flow']>[number]
type TalkData = NonNullable<FlowStep['talks']>[number]

const matchCutscenesForFlow = (
  flow: FlowStep,
  questCutscenes: CutsceneData[]
) => {
  if ((flow as { cutscenes?: CutsceneData[] }).cutscenes?.length) {
    return (flow as { cutscenes?: CutsceneData[] }).cutscenes ?? []
  }
  const talkIds = new Set((flow.talkIds ?? []).map((id) => Number(id)))
  return questCutscenes.filter((scene) => {
    const sceneId = getCutsceneId(scene)
    if (!sceneId) return false
    return sceneId === flow.subQuestId || talkIds.has(sceneId)
  })
}

type VoiceControls = {
  canPlay: boolean
  isPlaying: boolean
  onToggle: () => void
}

const renderLine = (
  line: DialogueLine,
  t: (key: string, vars?: Record<string, string | number>) => string,
  formatText: (value: string) => string,
  renderText: (value: string) => ReactNode,
  voiceControls?: VoiceControls
) => (
  <div
    className={cn(
      'rounded-xl border border-border bg-background px-4 py-3',
      voiceControls?.isPlaying && 'border-primary/60 bg-muted/40'
    )}
  >
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {line.speakerName ? formatText(line.speakerName) : t('questJson.speakerUnknown')}
        </span>
        {line.roleType && <Badge variant="outline">{line.roleType}</Badge>}
        <span className="text-muted-foreground/60">
          {t('questJson.nodeLabel', { id: line.nodeId })}
        </span>
      </div>
      {voiceControls?.canPlay && (
        <Button
          type="button"
          variant={voiceControls.isPlaying ? 'default' : 'outline'}
          size="icon"
          className="ml-auto h-7 w-7"
          onClick={voiceControls.onToggle}
          aria-label={voiceControls.isPlaying ? 'Pause voice' : 'Play voice'}
        >
          {voiceControls.isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
    <p className="mt-2 text-sm text-foreground/90">{renderText(line.text)}</p>
  </div>
)

const BranchDialogueGroup = ({
  options,
  joinNodeId,
  renderText,
  renderLineItem,
}: {
  options: Array<{ label: string; lines: DialogueLine[] }>
  joinNodeId?: number
  renderText: (value: string) => ReactNode
  renderLineItem: (line: DialogueLine) => ReactNode
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { t } = useI18n()

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <Button
            key={`${option.label}-${index}`}
            variant={selectedIndex === index ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedIndex(index)}
          >
            {option.label ? renderText(option.label) : t('questJson.branchLabel', { index: index + 1 })}
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        {options[selectedIndex]?.lines.length ? (
          options[selectedIndex].lines.map((line) => (
            <div key={line.nodeId}>{renderLineItem(line)}</div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{t('questJson.noDialogInBranch')}</p>
        )}
      </div>
      {!joinNodeId && (
        <p className="text-xs text-muted-foreground">{t('questJson.noJoinDetected')}</p>
      )}
    </div>
  )
}

const TalkRenderer = ({
  talk,
  renderLineItem,
}: {
  talk: TalkData
  renderLineItem: (line: DialogueLine) => ReactNode
}) => {
  const { t } = useI18n()
  const { settings } = usePlayerTextSettings()
  const renderText = useMemo(() => (value: string) => renderGameText(value, settings), [settings])
  const segments = useMemo(
    () =>
      buildTalkRenderSegments(talk, {
        branchLabel: (index) => t('questJson.branchLabel', { index: index + 1 }),
      }),
    [talk, t]
  )

  return (
    <div className="space-y-3">
      {segments.map((segment, index) => {
        if (segment.type === 'line') {
          return (
            <div key={`${segment.line.nodeId}-${index}`}>
              {renderLineItem(segment.line)}
            </div>
          )
        }
        return (
          <BranchDialogueGroup
            key={`branch-${index}`}
            options={segment.options}
            joinNodeId={segment.joinNodeId}
            renderText={renderText}
            renderLineItem={renderLineItem}
          />
        )
      })}
      {segments.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('questJson.noDialogNode')}</p>
      )}
    </div>
  )
}

export const QuestJsonReader = ({
  quest,
  questMeta,
  className,
  contentClassName,
  style,
}: QuestJsonReaderProps) => {
  const { t, locale, lang } = useI18n()
  const { settings } = usePlayerTextSettings()
  const formatText = useMemo(() => (value: string) => formatGameTextPlain(value, settings), [settings])
  const renderText = useMemo(() => (value: string) => renderGameText(value, settings), [settings])
  const flows = useMemo(() => {
    return [...(quest?.flow ?? [])].sort((a, b) => a.order - b.order)
  }, [quest?.flow])
  const questId = quest?.mainQuestId
  const { data: voiceIndex = {} } = useAsync<Record<string, string[]>>(
    (signal) => {
      if (lang !== 'zh' || !questId) {
        return Promise.resolve<Record<string, string[]>>({})
      }
      return getQuestVoiceIndex(questId, signal)
    },
    [questId, lang]
  )
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playingNodeId, setPlayingNodeId] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const currentSourcesRef = useRef<string[]>([])
  const currentSourceIndexRef = useRef(0)

  const meta = quest?.meta ?? {}
  const rewards = Array.isArray(meta.rewards) ? meta.rewards : []
  const rewardItems = rewards.flatMap((reward: any) => reward.items ?? [])
  const questCutscenes = (quest?.cutscenes ?? []) as CutsceneData[]

  const handleToggleVoice = useCallback(
    (line: DialogueLine) => {
      const audio = audioRef.current
      if (!audio) return
      const entry = voiceIndex?.[String(line.nodeId)]
      if (!entry?.length) return
      if (line.nodeId !== playingNodeId) {
        const sources = buildVoiceCandidates(entry[0])
        currentSourcesRef.current = sources
        currentSourceIndexRef.current = 0
        setPlayingNodeId(line.nodeId)
        audio.pause()
        audio.src = sources[0] ?? ''
        audio.load()
        audio.play().catch(() => setIsPlaying(false))
        return
      }
      if (audio.paused) {
        audio.play().catch(() => setIsPlaying(false))
      } else {
        audio.pause()
        setIsPlaying(false)
      }
    },
    [playingNodeId, voiceIndex]
  )

  const handleAudioError = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const sources = currentSourcesRef.current
    const nextIndex = currentSourceIndexRef.current + 1
    if (nextIndex < sources.length) {
      currentSourceIndexRef.current = nextIndex
      audio.src = sources[nextIndex]
      audio.load()
      audio.play().catch(() => setIsPlaying(false))
      return
    }
    setIsPlaying(false)
    setPlayingNodeId(null)
  }, [])

  const renderLineItem = useCallback(
    (line: DialogueLine) => {
      const entry = voiceIndex?.[String(line.nodeId)]
      const canPlay = Boolean(entry?.length)
      const active = isPlaying && playingNodeId === line.nodeId
      return renderLine(
        line,
        t,
        formatText,
        renderText,
        canPlay
          ? {
              canPlay,
              isPlaying: active,
              onToggle: () => handleToggleVoice(line),
            }
          : undefined
      )
    },
    [formatText, handleToggleVoice, isPlaying, playingNodeId, renderText, t, voiceIndex]
  )

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setPlayingNodeId(null)
    setIsPlaying(false)
    currentSourcesRef.current = []
    currentSourceIndexRef.current = 0
  }, [questId, lang])

  if (!quest) {
    return <p className="text-sm text-muted-foreground">{t('questJson.noQuestData')}</p>
  }

  return (
    <div className={cn('space-y-8', className)} style={style}>
      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => {
          setIsPlaying(false)
          setPlayingNodeId(null)
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={handleAudioError}
      />
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">
          {quest.mainQuestId} {quest.title}
        </h1>
        <p className="text-base text-muted-foreground">{quest.description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('questJson.infoTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('questJson.infoType')}</p>
            <p className="text-sm font-semibold">{meta.questType ?? questMeta?.questType ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('questJson.infoChapter')}</p>
            <p className="text-sm font-semibold">{meta.chapterTitle ?? questMeta?.chapterTitle ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('questJson.infoRegion')}</p>
            <p className="text-sm font-semibold">{meta.cityName ?? questMeta?.region ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('questJson.infoRecommend')}</p>
            <p className="text-sm font-semibold">{meta.recommendLevel ?? questMeta?.recommendLevel ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('questJson.infoNeed')}</p>
            <p className="text-sm font-semibold">{meta.needPlayerLevel ?? questMeta?.needPlayerLevel ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('questJson.infoMainQuestId')}</p>
            <p className="text-sm font-semibold">{quest.mainQuestId}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-xs text-muted-foreground">{t('questJson.infoPreMainQuest')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(meta.preMainQuestIds ?? questMeta?.preMainQuestIds ?? []).length ? (
                (meta.preMainQuestIds ?? questMeta?.preMainQuestIds ?? []).map((id: number) => (
                  <Badge key={`pre-${id}`} variant="secondary">
                    {id}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t('questJson.none')}</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-xs text-muted-foreground">{t('questJson.infoNextMainQuest')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(meta.nextMainQuestIds ?? questMeta?.nextMainQuestIds ?? []).length ? (
                (meta.nextMainQuestIds ?? questMeta?.nextMainQuestIds ?? []).map((id: number) => (
                  <Badge key={`next-${id}`} variant="secondary">
                    {id}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t('questJson.none')}</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-xs text-muted-foreground">{t('questJson.infoRewards')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rewardItems.length ? (
                rewardItems.map((item: any) => (
                  <Badge key={`${item.itemId}-${item.name}`} variant="outline">
                    {item.name} × {formatNumber(item.count ?? 0, locale)}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t('questJson.noRewards')}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className={cn('space-y-6', contentClassName)}>
        <h2 className="text-xl font-semibold">{t('questJson.flowTitle')}</h2>
        {flows.length === 0 && <p className="text-sm text-muted-foreground">{t('questJson.noFlow')}</p>}
        {flows.map((flow) => {
          const cutscenes = matchCutscenesForFlow(flow, questCutscenes)
          return (
            <Card key={flow.subQuestId}>
              <CardHeader>
                <CardTitle>
                  {t('questJson.stepTitle', { order: flow.order, subQuestId: flow.subQuestId })}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{flow.stepDescription}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <details className="rounded-lg border border-border bg-muted/40 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    {t('questJson.expandConditions')}
                  </summary>
                  <div className="mt-3">
                    <QuestConditionDetails data={flow.conditions ?? {}} />
                  </div>
                </details>

                {cutscenes.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">{t('questJson.cutsceneTitle')}</p>
                    <div className="space-y-2">
                      {cutscenes.map((scene, index) => (
                        <div
                          key={String(scene.cutsceneId ?? scene.resPath ?? index)}
                          className="rounded-xl border border-border bg-background p-4 text-sm"
                        >
                          <p className="font-semibold">
                            {scene.kind ?? 'cutscene'} ·{' '}
                            {scene.cutsceneId ?? t('questJson.cutsceneFallback')}
                          </p>
                          {scene.resPath && (
                            <p className="mt-1 text-xs text-muted-foreground">{scene.resPath}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t('questJson.dialogTitle')}</p>
                  {flow.talks?.length ? (
                    flow.talks.map((talk) => (
                      <div key={talk.talkId} className="space-y-3 rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">Talk {talk.talkId}</Badge>
                          {talk.talkConfig?.initDialog && (
                            <span>
                              {t('questJson.startNode', { id: talk.talkConfig.initDialog })}
                            </span>
                          )}
                        </div>
                        <TalkRenderer talk={talk} renderLineItem={renderLineItem} />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('questJson.noDialogStep')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {quest.questNarration?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('quest.tabs.narration')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quest.questNarration.map((line, index) => (
              <div key={index} className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <p className="text-xs text-muted-foreground">
                  {line.speakerName ? formatText(line.speakerName) : t('quest.tabs.narration')}
                </p>
                <p className="mt-2">{renderText(line.text)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
