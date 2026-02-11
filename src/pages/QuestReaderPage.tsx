import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Moon, Sun, Type } from 'lucide-react'
import { QuestJsonReader } from '../components/QuestJsonReader'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAsync } from '../hooks/useAsync'
import { getManifest, getQuestData } from '../lib/data'
import { useI18n } from '../lib/i18n'
import { getReaderPosition, setReaderPosition } from '../lib/storage'
import { clamp } from '../lib/utils'
import { buildTalkRenderSegments } from '../lib/talkGraph'
import { formatGameTextPlain, renderGameText } from '../lib/gameText'
import { usePlayerTextSettings } from '../lib/playerTextSettings'

export const QuestReaderPage = () => {
  const { id } = useParams()
  const questId = Number(id)
  const { t, lang, withLang } = useI18n()
  const { settings } = usePlayerTextSettings()
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])
  const { data: quest } = useAsync((signal) => getQuestData(questId, lang, signal), [questId, lang])
  const questMeta = manifest?.find((item) => item.id === questId)
  const [fontSize, setFontSize] = useState(16)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const fallbackTitle = t('reader.fallbackTitle', { id: questId })
    document.title = t('reader.title', { title: questMeta?.title ?? fallbackTitle })
  }, [questMeta?.title, questId, t])

  useEffect(() => {
    const position = getReaderPosition(questId)
    window.scrollTo({ top: position })
    const handler = () => setReaderPosition(questId, window.scrollY)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [questId])

  const combinedText = useMemo(() => {
    const formatText = (value: string) => formatGameTextPlain(value, settings)
    const parts: string[] = []
    if (quest) {
      parts.push(`# ${quest.mainQuestId} ${quest.title}`)
      parts.push(formatText(quest.description))
    }
    quest?.flow?.forEach((flow) => {
      parts.push(t('reader.stepLabel', { step: flow.order, subQuestId: flow.subQuestId }))
      if (flow.stepDescription) {
        parts.push(formatText(flow.stepDescription))
      }
      flow.talks?.forEach((talk) => {
        const segments = buildTalkRenderSegments(talk, {
          branchLabel: (index) => t('reader.branchLabel', { index: index + 1 }),
        })
        segments.forEach((segment) => {
          if (segment.type === 'line') {
            parts.push(
              `${segment.line.speakerName ? formatText(segment.line.speakerName) : t('reader.speakerFallback')}：${formatText(segment.line.text)}`
            )
            return
          }
          segment.options.forEach((option, index) => {
            const optionLabel = option.label ? formatText(option.label) : ''
            parts.push(
              t('reader.branchLabel', { index: index + 1 }) + `：${optionLabel}`
            )
            option.lines.forEach((line) => {
              parts.push(
                `${line.speakerName ? formatText(line.speakerName) : t('reader.speakerFallback')}：${formatText(line.text)}`
              )
            })
          })
        })
      })
      if (!flow.talks?.length) {
        parts.push(t('reader.noDialogInStep'))
      }
    })
    quest?.questNarration?.forEach((line) => {
      parts.push(t('reader.narrationLabel', { text: formatText(line.text) }))
    })
    return parts.join('\n')
  }, [quest, settings, t])

  const copyText = async (asMarkdown: boolean) => {
    const output = asMarkdown ? combinedText : combinedText.replace(/\n+/g, '\n')
    await navigator.clipboard.writeText(output)
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={withLang(`/quest/${questId}`)} className="flex items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" /> {t('quest.backToDetail')}
            </Link>
            <h1 className="mt-2 text-xl font-semibold">
              {questMeta?.title ?? t('reader.fallbackTitle', { id: questId })}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDarkMode((prev) => !prev)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{' '}
              {t('reader.themeToggle')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyText(false)}>
              <Copy className="h-4 w-4" /> {t('reader.copyText')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyText(true)}>
              <Copy className="h-4 w-4" /> {t('reader.copyMarkdown')}
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Type className="h-4 w-4" /> {t('reader.fontSize')}
            <Input
              type="number"
              value={fontSize}
              onChange={(event) => setFontSize(clamp(Number(event.target.value), 14, 24))}
              className="w-20"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            {t('reader.lineHeight')}
            <Input
              type="number"
              step="0.1"
              value={lineHeight}
              onChange={(event) => setLineHeight(clamp(Number(event.target.value), 1.4, 2.4))}
              className="w-20"
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Card className="p-6">
          <div style={{ fontSize, lineHeight }} className="prose-quest">
            <QuestJsonReader quest={quest ?? undefined} questMeta={questMeta} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">{t('reader.dialogAndNarration')}</h2>
          <div className="mt-4 space-y-3">
            {quest?.flow?.map((flow) => (
              <div key={flow.subQuestId} className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t('reader.stepHeader', { subQuestId: flow.subQuestId, step: flow.order })}
                </p>
                {flow.talks?.map((talk) =>
                  talk.dialogs?.map((dialog, index) => (
                    <div key={index} className="rounded-xl border border-border p-4">
                      <p className="text-sm font-semibold">
                        {dialog.speakerName
                          ? formatGameTextPlain(dialog.speakerName, settings)
                          : t('reader.speakerFallback')}
                      </p>
                      <p className="mt-1 text-sm text-foreground/90">
                        {renderGameText(dialog.text, settings)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ))}
            {quest?.questNarration?.map((line, index) => (
              <div key={index} className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-semibold">{t('reader.narrationSection')}</p>
                <p className="mt-1 text-sm text-foreground/90">
                  {renderGameText(line.text, settings)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  )
}
