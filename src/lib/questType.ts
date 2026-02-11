import type { QuestTypeCode } from '../types/quest'

export const QUEST_TYPE_COLORS: Record<QuestTypeCode, string> = {
  WQ: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  AQ: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
  LQ: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  IQ: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  EQ: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
}

export const QUEST_TYPE_ORDER: QuestTypeCode[] = ['AQ', 'LQ', 'IQ', 'WQ', 'EQ']
