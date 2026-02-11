import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, MessageCircle, ScrollText, Star, User, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { ClickableText } from '../components/ClickableText'
import { useAsync } from '../hooks/useAsync'
import { getManifest, getQuestData } from '../lib/data'
import { lookup, type DictionaryResult } from '../lib/dictionary'
import { useI18n } from '../lib/i18n'
import { buildTalkRenderSegments, type DialogueLine, type Segment } from '../lib/talkGraph'
import { getLanguageConfig, LANGUAGES, type LangCode } from '../lib/languages'
import { isSaved, toggleSave } from '../lib/vocabStorage'
import { formatGameTextPlain, renderGameText } from '../lib/gameText'
import { usePlayerTextSettings } from '../lib/playerTextSettings'
import type { ManifestQuest, QuestData } from '../types/quest'

const normalizeLang = (value: string | null): LangCode | null => {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'zh' || normalized === 'en' || normalized === 'ja') return normalized
  return null
}

const parseLangList = (value: string | null) =>
  (value ? value.split(',').map((item) => normalizeLang(item)).filter(Boolean) : []) as LangCode[]

const uniqueLangs = (langs: LangCode[]) => Array.from(new Set(langs))

const ensureLangColumns = (mainLang: LangCode, langs: LangCode[]) => {
  let next = uniqueLangs(langs)
  if (!next.includes(mainLang)) {
    next = [mainLang, ...next]
  }
  if (next.length < 2) {
    const fallback = LANGUAGES.find((lang) => lang.code !== mainLang)?.code
    if (fallback) next = [...next, fallback]
  }
  return next
}

const buildDialogMap = (quest: QuestData | null) => {
  const map = new Map<number, DialogueLine>()
  quest?.flow?.forEach((flow) => {
    flow.talks?.forEach((talk) => {
      talk.dialogs?.forEach((dialog) => {
        map.set(dialog.nodeId, {
          nodeId: dialog.nodeId,
          roleType: dialog.roleType,
          speakerId: dialog.speakerId,
          speakerName: dialog.speakerName,
          text: dialog.text,
        })
      })
    })
  })
  return map
}

const buildSpeakerCounts = (quest: QuestData | null) => {
  const map = new Map<number, { name: string; count: number }>()
  quest?.flow?.forEach((flow) => {
    flow.talks?.forEach((talk) => {
      talk.dialogs?.forEach((dialog) => {
        if (dialog.speakerId == null) return
        const current = map.get(dialog.speakerId)
        const nextCount = (current?.count ?? 0) + 1
        const name = dialog.speakerName ?? current?.name ?? ''
        map.set(dialog.speakerId, { name, count: nextCount })
      })
    })
  })
  return map
}

const buildRewardMap = (quest: QuestData | null) => {
  const map = new Map<number, { name: string; count: number }>()
  const rewards = quest?.meta?.rewards ?? []
  rewards.forEach((reward: any) => {
    reward?.items?.forEach((item: any) => {
      if (!item?.itemId) return
      const current = map.get(item.itemId)
      map.set(item.itemId, {
        name: item.name ?? current?.name ?? '',
        count: (current?.count ?? 0) + (item.count ?? 0),
      })
    })
  })
  return map
}

type QuestTalk = NonNullable<NonNullable<QuestData['flow']>[number]['talks']>[number]

const getSegments = (talk: QuestTalk) =>
  buildTalkRenderSegments(
    {
      talkConfig: talk.talkConfig,
      dialogs: talk.dialogs,
    },
    { branchLabel: (index) => `Branch ${index + 1}` }
  )

export const StudyQuestPage = () => {
  const { id } = useParams()
  const questId = Number(id)
  const [searchParams] = useSearchParams()
  const { t, lang: uiLang, withLang } = useI18n()
  const { settings } = usePlayerTextSettings()
  const renderText = useMemo(() => (value: string) => renderGameText(value, settings), [settings])
  const [activeTab, setActiveTab] = useState('dialogue')
  const [glossLang, setGlossLang] = useState<LangCode>(uiLang)
  const [selectedToken, setSelectedToken] = useState<{
    term: string
    sourceLang: LangCode
    questId: number
    nodeId?: number
    subQuestId?: number
    columnLang?: LangCode
    textSnippet?: string
  } | null>(null)
  const [lookupState, setLookupState] = useState<{
    loading: boolean
    result: DictionaryResult | null
  }>({ loading: false, result: null })
  const [savedVersion, setSavedVersion] = useState(0)

  const mainLang = normalizeLang(searchParams.get('main')) ?? uiLang
  const langList = useMemo(() => {
    const queryLangs = parseLangList(searchParams.get('langs'))
    return ensureLangColumns(mainLang, queryLangs.length ? queryLangs : [mainLang])
  }, [mainLang, searchParams.get('langs')])

  const { data, loading } = useAsync(async (signal) => {
    if (!questId) return null
    const results = await Promise.all(
      langList.map(async (code) => {
        try {
          const [quest, manifest] = await Promise.all([
            getQuestData(questId, code, signal),
            getManifest(code, signal),
          ])
          return {
            lang: code,
            quest,
            meta: manifest.find((item) => item.id === questId) ?? null,
          }
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            throw error
          }
          return { lang: code, quest: null, meta: null, error: error as Error }
        }
      })
    )
    return results
  }, [langList.join(','), questId])

  const questByLang = useMemo(() => {
    const map = new Map<LangCode, QuestData | null>()
    data?.forEach((entry) => map.set(entry.lang, entry.quest))
    return map
  }, [data])

  const metaByLang = useMemo(() => {
    const map = new Map<LangCode, ManifestQuest | null>()
    data?.forEach((entry) => map.set(entry.lang, entry.meta))
    return map
  }, [data])

  const primaryQuest = questByLang.get(mainLang) ?? questByLang.get(langList[0]) ?? null
  const primaryMeta = metaByLang.get(mainLang) ?? metaByLang.get(langList[0]) ?? null

  useEffect(() => {
    const title = primaryMeta?.title ?? t('common.questFallback', { id: questId })
    document.title = `${title} · ${t('study.studyLabel')}`
  }, [primaryMeta?.title, questId, t])

  const dialogMaps = useMemo(() => {
    const map = new Map<LangCode, Map<number, DialogueLine>>()
    langList.forEach((code) => {
      map.set(code, buildDialogMap(questByLang.get(code) ?? null))
    })
    return map
  }, [langList, questByLang])

  const flowMaps = useMemo(() => {
    const map = new Map<LangCode, Map<number, NonNullable<QuestData['flow']>[number]>>()
    langList.forEach((code) => {
      const flows = questByLang.get(code)?.flow ?? []
      map.set(code, new Map(flows.map((flow) => [flow.subQuestId, flow])))
    })
    return map
  }, [langList, questByLang])

  const flowOrder = useMemo(() => {
    const primaryFlows = primaryQuest?.flow ?? []
    const order = primaryFlows.map((flow) => flow.subQuestId)
    const seen = new Set(order)
    langList.forEach((code) => {
      flowMaps.get(code)?.forEach((_, key) => {
        if (!seen.has(key)) {
          order.push(key)
          seen.add(key)
        }
      })
    })
    return order
  }, [flowMaps, langList, primaryQuest])

  const speakerMaps = useMemo(() => {
    const map = new Map<LangCode, Map<number, { name: string; count: number }>>()
    langList.forEach((code) => {
      map.set(code, buildSpeakerCounts(questByLang.get(code) ?? null))
    })
    return map
  }, [langList, questByLang])

  const speakerIds = useMemo(() => {
    const set = new Set<number>()
    speakerMaps.forEach((map) => map.forEach((_, key) => set.add(key)))
    return Array.from(set).sort((a, b) => a - b)
  }, [speakerMaps])

  const rewardMaps = useMemo(() => {
    const map = new Map<LangCode, Map<number, { name: string; count: number }>>()
    langList.forEach((code) => {
      map.set(code, buildRewardMap(questByLang.get(code) ?? null))
    })
    return map
  }, [langList, questByLang])

  const rewardIds = useMemo(() => {
    const set = new Set<number>()
    rewardMaps.forEach((map) => map.forEach((_, key) => set.add(key)))
    return Array.from(set).sort((a, b) => a - b)
  }, [rewardMaps])

  useEffect(() => {
    if (!selectedToken) return
    let active = true
    setLookupState((prev) => ({ ...prev, loading: true }))
    lookup(selectedToken.term, selectedToken.sourceLang, glossLang)
      .then((result) => {
        if (!active) return
        setLookupState({ loading: false, result })
      })
      .catch(() => {
        if (!active) return
        setLookupState({
          loading: false,
          result: {
            meanings: ['(No definition found)'],
            provider: 'Fallback',
            error: 'api_unreachable',
          },
        })
      })
    return () => {
      active = false
    }
  }, [glossLang, selectedToken])

  const narrationLines = useMemo(() => {
    const linesByLang = new Map<LangCode, QuestData['questNarration']>()
    let max = 0
    langList.forEach((code) => {
      const lines = questByLang.get(code)?.questNarration ?? []
      linesByLang.set(code, lines)
      max = Math.max(max, lines.length)
    })
    return { linesByLang, max }
  }, [langList, questByLang])

  const columnTemplate = `minmax(150px, 180px) repeat(${langList.length}, minmax(0, 1fr))`

  const handleTokenClick = (
    term: string,
    meta: {
      sourceLang: LangCode
      nodeId?: number
      subQuestId?: number
      textSnippet?: string
    }
  ) => {
    setSelectedToken({
      term,
      sourceLang: meta.sourceLang,
      questId,
      nodeId: meta.nodeId,
      subQuestId: meta.subQuestId,
      columnLang: meta.sourceLang,
      textSnippet: meta.textSnippet,
    })
  }

  const handleToggleSave = () => {
    if (!selectedToken || !lookupState.result) return
    toggleSave({
      term: selectedToken.term,
      sourceLang: selectedToken.sourceLang,
      glossLang,
      meanings: lookupState.result.meanings ?? [],
      sources: [
        {
          questId: selectedToken.questId,
          nodeId: selectedToken.nodeId,
          subQuestId: selectedToken.subQuestId,
          columnLang: selectedToken.columnLang,
          textSnippet: selectedToken.textSnippet,
        },
      ],
    })
    setSavedVersion((value) => value + 1)
  }

  const saved = useMemo(() => {
    if (!selectedToken) return false
    return isSaved(selectedToken.sourceLang, glossLang, selectedToken.term)
  }, [glossLang, savedVersion, selectedToken])

  const renderRow = (label: string, values: React.ReactNode[]) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
      <div className="text-sm font-semibold text-muted-foreground">{label}</div>
      {values.map((value, index) => (
        <div key={index} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          {value}
        </div>
      ))}
    </div>
  )

  const renderDialogueRow = (nodeId: number) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
      <div className="flex items-start gap-2">
        <Badge variant="secondary">#{nodeId}</Badge>
      </div>
      {langList.map((code) => {
        const dialog = dialogMaps.get(code)?.get(nodeId)
        const config = getLanguageConfig(code)
        if (!dialog) {
          return (
            <div key={code} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              {t('study.missing')}
            </div>
          )
        }
        const speakerName = dialog.speakerName
          ? formatGameTextPlain(dialog.speakerName, settings)
          : config.unknownSpeaker
        const lineText = formatGameTextPlain(dialog.text || t('study.missing'), settings)
        return (
          <div key={code} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              <ClickableText
                text={speakerName}
                lang={code}
                onClickToken={(term) =>
                  handleTokenClick(term, {
                    sourceLang: code,
                    nodeId,
                    textSnippet: speakerName,
                  })
                }
              />
            </p>
            <p className="mt-1 leading-relaxed">
              <ClickableText
                text={lineText}
                lang={code}
                onClickToken={(term) =>
                  handleTokenClick(term, {
                    sourceLang: code,
                    nodeId,
                    textSnippet: lineText,
                  })
                }
              />
            </p>
          </div>
        )
      })}
    </div>
  )

  const overviewRows = [
    {
      label: t('study.overview.title'),
      values: langList.map((code) => (
        <ClickableText
          key={code}
          text={metaByLang.get(code)?.title ?? t('study.missing')}
          lang={code}
          onClickToken={(term) =>
            handleTokenClick(term, {
              sourceLang: code,
              textSnippet: metaByLang.get(code)?.title ?? t('study.missing'),
            })
          }
        />
      )),
    },
    {
      label: t('study.overview.description'),
      values: langList.map((code) => (
        <ClickableText
          key={code}
          text={metaByLang.get(code)?.description ?? t('study.missing')}
          lang={code}
          onClickToken={(term) =>
            handleTokenClick(term, {
              sourceLang: code,
              textSnippet: metaByLang.get(code)?.description ?? t('study.missing'),
            })
          }
        />
      )),
    },
    {
      label: t('study.overview.chapter'),
      values: langList.map((code) => {
        const meta = metaByLang.get(code)
        if (!meta) return t('study.missing')
        return (
          <ClickableText
            text={`${meta.chapterNum} · ${meta.chapterTitle}`}
            lang={code}
            onClickToken={(term) =>
              handleTokenClick(term, {
                sourceLang: code,
                textSnippet: `${meta.chapterNum} · ${meta.chapterTitle}`,
              })
            }
          />
        )
      }),
    },
    {
      label: t('study.overview.region'),
      values: langList.map((code) => (
        <ClickableText
          key={code}
          text={metaByLang.get(code)?.region ?? t('study.missing')}
          lang={code}
          onClickToken={(term) =>
            handleTokenClick(term, {
              sourceLang: code,
              textSnippet: metaByLang.get(code)?.region ?? t('study.missing'),
            })
          }
        />
      )),
    },
    {
      label: t('study.overview.questType'),
      values: langList.map((code) => (
        <ClickableText
          key={code}
          text={metaByLang.get(code)?.questTypeLabel ?? t('study.missing')}
          lang={code}
          onClickToken={(term) =>
            handleTokenClick(term, {
              sourceLang: code,
              textSnippet: metaByLang.get(code)?.questTypeLabel ?? t('study.missing'),
            })
          }
        />
      )),
    },
  ]

  const tabs = [
    { id: 'dialogue', label: t('study.tabs.dialogue'), icon: MessageCircle },
    { id: 'steps', label: t('study.tabs.steps'), icon: ScrollText },
    { id: 'speakers', label: t('study.tabs.speakers'), icon: User },
    { id: 'rewards', label: t('study.tabs.rewards'), icon: Star },
  ]

  if (!questId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">{t('study.invalidQuest')}</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to={withLang('/study')} className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> {t('study.backToHome')}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">
            {primaryMeta?.title ?? t('common.questFallback', { id: questId })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{primaryMeta?.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {langList.map((code) => {
            const config = getLanguageConfig(code)
            return (
              <Badge key={code} variant={code === mainLang ? 'default' : 'secondary'}>
                {config.displayName}
              </Badge>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('study.overviewTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
            <div />
            {langList.map((code) => {
              const config = getLanguageConfig(code)
              return (
                <div key={code} className="text-sm font-semibold">
                  {config.displayName} ({code})
                </div>
              )
            })}
          </div>
          {overviewRows.map((row) => renderRow(row.label, row.values))}
        </CardContent>
      </Card>

      <Tabs>
        <TabsList>
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {activeTab === 'dialogue' && (
          <TabsContent>
            <div className="space-y-6">
              {(primaryQuest?.flow ?? []).map((flow) => (
                <Card key={flow.subQuestId}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <Badge variant="secondary">{t('study.flowBadge', { id: flow.subQuestId })}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {t('study.flowOrder', { order: flow.order })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {flow.talks?.length ? (
                      flow.talks.map((talk, talkIndex) => {
                        const segments = getSegments(talk)
                        return (
                          <div key={`${flow.subQuestId}-${talk.talkId ?? talkIndex}`} className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Badge variant="outline">Talk {talk.talkId ?? talkIndex + 1}</Badge>
                              <span className="text-muted-foreground">{t('study.dialogueSegment')}</span>
                            </div>
                            {segments.length ? (
                              segments.map((segment, segmentIndex) => (
                                <SegmentBlock
                                  key={`${talk.talkId ?? talkIndex}-${segmentIndex}`}
                                  segment={segment}
                                  renderDialogueRow={renderDialogueRow}
                                  columnTemplate={columnTemplate}
                                  missingLabel={t('study.missing')}
                                  branchLabel={t('study.branchLabel')}
                                  renderText={renderText}
                                />
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">{t('study.noDialogues')}</p>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('study.noDialogues')}</p>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle>{t('study.narrationTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {narrationLines.max ? (
                    Array.from({ length: narrationLines.max }).map((_, index) => (
                      <div key={index} className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                        <div className="flex items-start gap-2">
                          <Badge variant="secondary">#{index + 1}</Badge>
                        </div>
                        {langList.map((code) => {
                          const lines = narrationLines.linesByLang.get(code) ?? []
                          const line = lines[index]
                          if (!line) {
                            return (
                              <div
                                key={code}
                                className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                              >
                                {t('study.missing')}
                              </div>
                            )
                          }
                          return (
                            <div
                              key={code}
                              className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                            >
                              {(() => {
                                const speakerName = line.speakerName
                                  ? formatGameTextPlain(line.speakerName, settings)
                                  : getLanguageConfig(code).unknownSpeaker
                                const textValue = formatGameTextPlain(line.text, settings)
                                return (
                                  <>
                                    <p className="text-xs text-muted-foreground">
                                      <ClickableText
                                        text={speakerName}
                                        lang={code}
                                        onClickToken={(term) =>
                                          handleTokenClick(term, {
                                            sourceLang: code,
                                            textSnippet: speakerName,
                                          })
                                        }
                                      />
                                    </p>
                                    <p className="mt-1 leading-relaxed">
                                      <ClickableText
                                        text={textValue}
                                        lang={code}
                                        onClickToken={(term) =>
                                          handleTokenClick(term, {
                                            sourceLang: code,
                                            textSnippet: textValue,
                                          })
                                        }
                                      />
                                    </p>
                                  </>
                                )
                              })()}
                            </div>
                          )
                        })}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('study.noNarration')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {activeTab === 'steps' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('study.stepsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                  <div className="text-sm font-semibold text-muted-foreground">
                    {t('study.stepHeader')}
                  </div>
                  {langList.map((code) => (
                    <div key={code} className="text-sm font-semibold">
                      {getLanguageConfig(code).displayName}
                    </div>
                  ))}
                </div>
                {flowOrder.map((subQuestId) => (
                  <div key={subQuestId} className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                    <div className="text-sm font-semibold text-muted-foreground">
                      <div>{t('study.subQuestId', { id: subQuestId })}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('study.flowOrderShort', {
                          order: flowMaps.get(mainLang)?.get(subQuestId)?.order ?? '--',
                        })}
                      </div>
                    </div>
                    {langList.map((code) => {
                      const flow = flowMaps.get(code)?.get(subQuestId)
                      return (
                        <div
                          key={code}
                          className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                        >
                          <ClickableText
                            text={flow?.stepDescription ?? t('study.missing')}
                            lang={code}
                            onClickToken={(term) =>
                              handleTokenClick(term, {
                                sourceLang: code,
                                subQuestId,
                                textSnippet: flow?.stepDescription ?? t('study.missing'),
                              })
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'speakers' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('study.speakersTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                  <div className="text-sm font-semibold text-muted-foreground">{t('study.speakerId')}</div>
                  {langList.map((code) => (
                    <div key={code} className="text-sm font-semibold">
                      {getLanguageConfig(code).displayName}
                    </div>
                  ))}
                </div>
                {speakerIds.length ? (
                  speakerIds.map((speakerId) => (
                    <div key={speakerId} className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                      <div className="text-sm font-semibold text-muted-foreground">{speakerId}</div>
                      {langList.map((code) => {
                        const entry = speakerMaps.get(code)?.get(speakerId)
                        const rawName =
                          entry?.name || getLanguageConfig(code).unknownSpeaker || t('study.missing')
                        const name = formatGameTextPlain(rawName, settings)
                        const count = entry?.count ?? 0
                        return (
                          <div
                            key={code}
                            className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                          >
                            <p className="font-semibold">
                              <ClickableText
                                text={name}
                                lang={code}
                                onClickToken={(term) =>
                                  handleTokenClick(term, {
                                    sourceLang: code,
                                    textSnippet: name,
                                  })
                                }
                              />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('study.speakerCount', { count })}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('study.noSpeakers')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === 'rewards' && (
          <TabsContent>
            <Card>
              <CardHeader>
                <CardTitle>{t('study.rewardsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                  <div className="text-sm font-semibold text-muted-foreground">{t('study.rewardId')}</div>
                  {langList.map((code) => (
                    <div key={code} className="text-sm font-semibold">
                      {getLanguageConfig(code).displayName}
                    </div>
                  ))}
                </div>
                {rewardIds.length ? (
                  rewardIds.map((itemId) => (
                    <div key={itemId} className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                      <div className="text-sm font-semibold text-muted-foreground">{itemId}</div>
                      {langList.map((code) => {
                        const entry = rewardMaps.get(code)?.get(itemId)
                        if (!entry) {
                          return (
                            <div
                              key={code}
                              className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                            >
                              {t('study.missing')}
                            </div>
                          )
                        }
                        return (
                          <div
                            key={code}
                            className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
                          >
                            <p className="font-semibold">
                              <ClickableText
                                text={entry.name || t('study.missing')}
                                lang={code}
                                onClickToken={(term) =>
                                  handleTokenClick(term, {
                                    sourceLang: code,
                                    textSnippet: entry.name || t('study.missing'),
                                  })
                                }
                              />
                            </p>
                            <p className="text-xs text-muted-foreground">× {entry.count}</p>
                          </div>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('study.noRewards')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {loading && (
        <p className="text-sm text-muted-foreground">{t('study.loading')}</p>
      )}

      {selectedToken && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-xl rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{t('study.lookupTitle')}</h2>
                <p className="text-sm text-muted-foreground">{selectedToken.term}</p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                onClick={() => setSelectedToken(null)}
                aria-label={t('study.lookupClose')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t('study.sourceLangLabel')}</p>
                  <p className="font-semibold">{getLanguageConfig(selectedToken.sourceLang).displayName}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground" htmlFor="glossLang">
                    {t('study.glossLangLabel')}
                  </label>
                  <select
                    id="glossLang"
                    value={glossLang}
                    onChange={(event) => setGlossLang(event.target.value as LangCode)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{t('study.lookupDefinition')}</p>
                {lookupState.loading ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t('study.lookupLoading')}</p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {(lookupState.result?.meanings?.length
                      ? lookupState.result?.meanings
                      : [t('study.lookupEmpty')])
                      ?.filter(Boolean)
                      .map((meaning, index) => (
                        <li key={index}>{meaning}</li>
                      ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {t('study.lookupProvider')}: {lookupState.result?.provider ?? t('study.lookupUnknown')}
                  </span>
                  {lookupState.result?.error && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      {t('study.lookupApiError')}
                    </span>
                  )}
                </div>
                {lookupState.result?.externalUrl && (
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <a href={lookupState.result.externalUrl} target="_blank" rel="noreferrer">
                        {t('study.lookupExternal')}
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">{t('study.lookupSourceInfo')}</p>
                <p>{t('study.lookupQuestId', { id: selectedToken.questId })}</p>
                {selectedToken.nodeId != null && (
                  <p>{t('study.lookupNodeId', { id: selectedToken.nodeId })}</p>
                )}
                {selectedToken.subQuestId != null && (
                  <p>{t('study.lookupSubQuestId', { id: selectedToken.subQuestId })}</p>
                )}
                <p>{t('study.lookupColumnLang', { lang: selectedToken.sourceLang })}</p>
                {selectedToken.textSnippet && (
                  <p className="mt-2">
                    <span className="font-semibold text-foreground">{t('study.lookupSnippet')}:</span>{' '}
                    {selectedToken.textSnippet}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <Button variant="outline" onClick={() => setSelectedToken(null)}>
                {t('study.lookupClose')}
              </Button>
              <Button onClick={handleToggleSave} disabled={!selectedToken || lookupState.loading}>
                {saved ? t('study.vocabRemove') : t('study.vocabSave')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SegmentBlock = ({
  segment,
  renderDialogueRow,
  columnTemplate,
  missingLabel,
  branchLabel,
  renderText,
}: {
  segment: Segment
  renderDialogueRow: (nodeId: number) => React.ReactNode
  columnTemplate: string
  missingLabel: string
  branchLabel: string
  renderText: (value: string) => React.ReactNode
}) => {
  if (segment.type === 'line') {
    return <div className="space-y-2">{renderDialogueRow(segment.line.nodeId)}</div>
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <ChevronDown className="h-4 w-4" /> {branchLabel}
      </div>
      <div className="space-y-3">
        {segment.options.map((option, index) => (
          <details
            key={index}
            className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
          >
            <summary className="cursor-pointer font-semibold">
              {option.label ? renderText(option.label) : `Option ${index + 1}`}
            </summary>
            <div className="mt-3 space-y-2">
              {option.lines.length ? (
                option.lines.map((line) => (
                  <div key={line.nodeId} className="space-y-2">
                    {renderDialogueRow(line.nodeId)}
                  </div>
                ))
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: columnTemplate }}>
                  <div className="text-sm font-semibold text-muted-foreground">—</div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    {missingLabel}
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
