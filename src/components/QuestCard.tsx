import { Link } from 'react-router-dom'
import { MessageCircle, PlayCircle, Star } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { QUEST_TYPE_COLORS } from '../lib/questType'
import type { ManifestQuest } from '../types/quest'
import { toggleFavorite, getFavorites } from '../lib/storage'
import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { formatNumber } from '../lib/utils'

export const QuestCard = ({ quest }: { quest: ManifestQuest }) => {
  const [favorites, setFavorites] = useState(() => getFavorites())
  const isFavorite = favorites.includes(quest.id)
  const { t, withLang, locale } = useI18n()

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link to={withLang(`/quest/${quest.id}`)} className="text-base font-semibold">
            {quest.title}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {quest.chapterNum || quest.chapterTitle || t('questCard.chapterFallback')} ·{' '}
            {t('questCard.recommendLevel')} {quest.recommendLevel || '--'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={QUEST_TYPE_COLORS[quest.questType]}>
            {quest.questTypeLabel} · {quest.questType}
          </Badge>
          {quest.hidden && <Badge variant="secondary">{t('questCard.hidden')}</Badge>}
        </div>
      </div>
      <p className="mt-3 max-h-10 overflow-hidden text-sm text-muted-foreground">{quest.description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />{' '}
            {t('questCard.dialogCount', {
              count: formatNumber(quest.dialogCount, locale),
            })}
          </span>
          <span className="flex items-center gap-1">
            <PlayCircle className="h-4 w-4" />{' '}
            {quest.hasCutscenes ? t('questCard.cutsceneHas') : t('questCard.cutsceneNone')}
          </span>
        </div>
        <Button
          variant={isFavorite ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFavorites(toggleFavorite(quest.id))}
        >
          <Star className="h-4 w-4" />
          {isFavorite ? t('questCard.favorited') : t('questCard.favorite')}
        </Button>
      </div>
    </div>
  )
}
