import { promises as fs } from 'node:fs'
import path from 'node:path'
import { LANGUAGES, type LangCode } from '../src/lib/languages'
import type { ManifestQuest, SiteStats } from '../src/types/quest'
import type { SpeakerIndexEntry, SpeakerTaskSummary, SpeakersIndex } from '../src/types/speakers'

const readJson = async <T>(filePath: string): Promise<T> => {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true })
}

const sortNumeric = (a: number, b: number) => a - b

const getDataDir = (root: string, lang: LangCode) => {
  if (lang === 'zh') return path.join(root, 'public', 'data')
  return path.join(root, 'public', 'data', lang)
}

const getGeneratedDir = (root: string, lang: LangCode) => {
  if (lang === 'zh') return path.join(root, 'public', 'generated')
  return path.join(root, 'public', 'generated', lang)
}

const buildSpeakersIndex = async (lang: LangCode, locale: string) => {
  const root = process.cwd()
  const dataDir = getDataDir(root, lang)
  const generatedDir = getGeneratedDir(root, lang)

  const manifest = await readJson<ManifestQuest[]>(path.join(dataDir, 'manifest.json'))
  const speakerIndex = await readJson<Record<string, number[]>>(
    path.join(dataDir, 'speaker_index.json')
  )
  const siteStats = await readJson<SiteStats>(path.join(dataDir, 'site_stats.json'))

  const taskSummaryById: Record<string, SpeakerTaskSummary> = {}
  for (const quest of manifest) {
    taskSummaryById[String(quest.id)] = {
      id: quest.id,
      title: quest.title,
      region: quest.region,
      questType: quest.questType,
      questTypeLabel: quest.questTypeLabel,
    }
  }

  const speakersMap = new Map<string, SpeakerIndexEntry & { taskIdsSet: Set<number> }>()
  for (const [speakerId, stats] of Object.entries(siteStats.speakerTotals)) {
    speakersMap.set(speakerId, {
      id: speakerId,
      name: stats.speakerName,
      role: null,
      avatar: null,
      bio: null,
      taskIds: [],
      taskCount: 0,
      count: stats.count,
      taskIdsSet: new Set<number>(),
    })
  }

  for (const [speakerId, questIds] of Object.entries(speakerIndex)) {
    const entry = speakersMap.get(speakerId) ?? {
      id: speakerId,
      name: siteStats.speakerTotals[speakerId]?.speakerName ?? '未知角色',
      role: null,
      avatar: null,
      bio: null,
      taskIds: [],
      taskCount: 0,
      count: siteStats.speakerTotals[speakerId]?.count ?? 0,
      taskIdsSet: new Set<number>(),
    }
    for (const questId of questIds) {
      if (!taskSummaryById[String(questId)]) continue
      entry.taskIdsSet.add(questId)
    }
    speakersMap.set(speakerId, entry)
  }

  const speakers = Array.from(speakersMap.values()).map((speaker) => {
    const taskIds = Array.from(speaker.taskIdsSet).sort(sortNumeric)
    return {
      id: speaker.id,
      name: speaker.name,
      role: speaker.role,
      avatar: speaker.avatar,
      bio: speaker.bio,
      taskIds,
      taskCount: taskIds.length,
      count: speaker.count,
    }
  })

  speakers.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    const nameDiff = a.name.localeCompare(b.name, locale)
    if (nameDiff !== 0) return nameDiff
    return a.id.localeCompare(b.id)
  })

  if (speakers.length === 0) {
    throw new Error('No speakers were generated. Check source data.')
  }

  const speakerById: Record<string, SpeakerIndexEntry> = {}
  for (const speaker of speakers) {
    speakerById[speaker.id] = speaker
  }

  const payload: SpeakersIndex = {
    generatedAt: siteStats.generatedAt,
    speakers,
    speakerById,
    taskSummaryById,
  }

  await ensureDir(generatedDir)
  await fs.writeFile(
    path.join(generatedDir, 'speakers-index.json'),
    JSON.stringify(payload, null, 2),
    'utf-8'
  )

  console.log(`Speakers index generated (${lang}): ${speakers.length} speakers`)
}

const buildAll = async () => {
  for (const language of LANGUAGES) {
    await buildSpeakersIndex(language.code, language.locale)
  }
}

buildAll().catch((error) => {
  console.error('Failed to precompute speakers index', error)
  process.exit(1)
})
