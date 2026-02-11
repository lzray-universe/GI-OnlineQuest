import type { QuestTypeCode } from './quest'

export type SpeakerTaskSummary = {
  id: number
  title: string
  region: string
  questType: QuestTypeCode
  questTypeLabel: string
}

export type SpeakerIndexEntry = {
  id: string
  name: string
  role: string | null
  avatar: string | null
  bio: string | null
  taskIds: number[]
  taskCount: number
  count: number
}

export type SpeakersIndex = {
  generatedAt: string
  speakers: SpeakerIndexEntry[]
  speakerById: Record<string, SpeakerIndexEntry>
  taskSummaryById: Record<string, SpeakerTaskSummary>
}
