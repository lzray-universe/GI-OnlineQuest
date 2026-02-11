import type { ManifestQuest } from '../types/quest'

export type ChapterGroup = {
  chapterId: number
  chapterNum: string
  chapterTitle: string
  quests: ManifestQuest[]
}

const normalizeChapterLabel = (value: string | undefined) => value?.trim() ?? ''

export const groupQuestsByChapter = (
  quests: ManifestQuest[],
  fallbackChapterLabel = ''
) => {
  const map = new Map<number, ChapterGroup>()
  quests.forEach((quest) => {
    const chapterId = quest.chapterId ?? 0
    const existing = map.get(chapterId)
    const chapterNum = normalizeChapterLabel(quest.chapterNum) || fallbackChapterLabel
    const chapterTitle = normalizeChapterLabel(quest.chapterTitle)
    if (!existing) {
      map.set(chapterId, {
        chapterId,
        chapterNum,
        chapterTitle,
        quests: [quest],
      })
    } else {
      existing.quests.push(quest)
      if (!existing.chapterTitle && chapterTitle) existing.chapterTitle = chapterTitle
      if (!existing.chapterNum && chapterNum) existing.chapterNum = chapterNum
    }
  })
  return Array.from(map.values())
}

export const sortChapterGroups = (
  groups: ChapterGroup[],
  sortKey: 'chapter' | 'level' | 'id' | 'title',
  locale = 'en-US'
) => {
  const getMin = (group: ChapterGroup, getter: (quest: ManifestQuest) => number) =>
    Math.min(...group.quests.map(getter))
  return groups.slice().sort((a, b) => {
    switch (sortKey) {
      case 'level':
        return getMin(a, (quest) => quest.recommendLevel) - getMin(b, (quest) => quest.recommendLevel)
      case 'title':
        return a.chapterNum.localeCompare(b.chapterNum, locale)
      case 'id':
        return getMin(a, (quest) => quest.id) - getMin(b, (quest) => quest.id)
      default:
        return a.chapterId - b.chapterId
    }
  })
}
