export type QuestTypeCode = 'WQ' | 'AQ' | 'LQ' | 'IQ' | 'EQ'

export type ManifestQuest = {
  id: number
  title: string
  description: string
  questType: QuestTypeCode
  questTypeLabel: string
  region: string
  regionKey: string
  showType: string
  hidden: boolean
  chapterId: number
  chapterTitle: string
  chapterNum: string
  recommendLevel: number
  needPlayerLevel: number
  preMainQuestIds: number[]
  nextMainQuestIds: number[]
  hasReadable: boolean
  readablePath: string
  hasCutscenes: boolean
  hasVideoSubtitles: boolean
  talkLineCount: number
  dialogCount: number
  topSpeakers: Array<{ roleType?: string; speakerId?: number; speakerName?: string; count?: number }>
  rewardSummary?: string
}

export type QuestData = {
  mainQuestId: number
  title: string
  description: string
  meta: Record<string, any>
  flow?: Array<{
    subQuestId: number
    order: number
    stepDescription: string
    isHidden: boolean
    conditions?: Record<string, any>
    talkIds?: number[]
    talks?: Array<{
      talkId: number
      talkConfig?: Record<string, any>
      dialogs?: Array<{
        nodeId: number
        roleType: string
        speakerId: number | null
        speakerName: string | null
        text: string
        nextNodeIds?: number[]
      }>
    }>
  }>
  questNarration?: Array<{ roleType?: string; speakerId?: number; speakerName?: string; text: string }>
  talkIds?: number[]
  unmappedTalks?: Array<any>
  speakerCounts?: Array<{ roleType?: string; speakerId?: number; speakerName?: string; count?: number }>
  cutscenes?: Array<any>
  raw?: Record<string, any>
}

export type IndexesData = {
  byRegion: Record<string, Record<string, number[]>>
  byType: Record<string, Record<string, number[]>>
  counts: {
    total: number
    hidden: number
    regions: Record<string, number>
    types: Record<string, number>
  }
}

export type SiteStats = {
  generatedAt: string
  totalQuests: number
  hiddenQuests: number
  dialogLines: number
  narrationLines: number
  cutscenes: number
  cutscenesWithSubtitles: number
  speakerTotals: Record<string, { speakerId: number; speakerName: string; count: number }>
  byRegion: Record<
    string,
    {
      totalQuests: number
      dialogLines: number
      narrationLines: number
      cutscenes: number
      cutscenesWithSubtitles: number
    }
  >
  byType: Record<
    string,
    {
      totalQuests: number
      dialogLines: number
      narrationLines: number
      cutscenes: number
      cutscenesWithSubtitles: number
    }
  >
}
