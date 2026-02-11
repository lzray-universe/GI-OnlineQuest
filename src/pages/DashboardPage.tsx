import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Compass,
  History,
  Map as MapIcon,
  MessageCircle,
  Sparkles,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAsync } from '../hooks/useAsync'
import { getIndexes, getManifest, getSiteStats } from '../lib/data'
import { useI18n } from '../lib/i18n'
import { QUEST_TYPE_ORDER } from '../lib/questType'
import { getFavorites, getRecent } from '../lib/storage'

export const DashboardPage = () => {
  const { t, lang, withLang, numberFormat, questTypeLabel } = useI18n()
  const { data: indexes } = useAsync((signal) => getIndexes(lang, signal), [lang])
  const { data: stats } = useAsync((signal) => getSiteStats(lang, signal), [lang])
  const { data: manifest } = useAsync((signal) => getManifest(lang, signal), [lang])

  useEffect(() => {
    document.title = t('dashboard.title')
  }, [t])

  const recent = useMemo(() => getRecent(), [])
  const favorites = useMemo(() => getFavorites(), [])

  const lookup = useMemo(() => {
    const map = new Map<number, string>()
    manifest?.forEach((quest) => map.set(quest.id, quest.title))
    return map
  }, [manifest])

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> {t('dashboard.overviewTitle')}
            </CardTitle>
            <CardDescription>{t('dashboard.overviewDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between text-sm">
              <span>{t('dashboard.stats.totalQuests')}</span>
              <span className="text-lg font-semibold">
                {stats ? numberFormat(stats.totalQuests) : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{t('dashboard.stats.hiddenQuests')}</span>
              <span className="text-lg font-semibold">
                {stats ? numberFormat(stats.hiddenQuests) : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{t('dashboard.stats.dialogLines')}</span>
              <span className="text-lg font-semibold">
                {stats ? numberFormat(stats.dialogLines) : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{t('dashboard.stats.narrationLines')}</span>
              <span className="text-lg font-semibold">
                {stats ? numberFormat(stats.narrationLines) : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{t('dashboard.stats.cutscenes')}</span>
              <span className="text-lg font-semibold">
                {stats ? numberFormat(stats.cutscenes) : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{t('dashboard.stats.cutscenesWithSubtitles')}</span>
              <span className="text-lg font-semibold">
                {stats ? numberFormat(stats.cutscenesWithSubtitles) : '--'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> {t('dashboard.shortcutsTitle')}
            </CardTitle>
            <CardDescription>{t('dashboard.shortcutsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('dashboard.stats.region')}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {indexes &&
                  Object.entries(indexes.counts.regions).map(([region, count]) => (
                    <Link
                      key={region}
                      to={withLang(`/region/${encodeURIComponent(region)}`)}
                      className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <MapIcon className="h-4 w-4 text-primary" /> {region}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {numberFormat(count)}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">
                {t('dashboard.stats.type')}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {indexes &&
                  QUEST_TYPE_ORDER.map((type) => (
                    <Link
                      key={type}
                      to={withLang(`/type/${type}`)}
                      className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Compass className="h-4 w-4 text-primary" /> {questTypeLabel(type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {numberFormat(indexes.counts.types[type] ?? 0)}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> {t('dashboard.recentTitle')}
            </CardTitle>
            <CardDescription>{t('dashboard.recentDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('dashboard.noRecent')}</p>
            )}
            {recent.map((id) => (
              <Link
                key={id}
                to={withLang(`/quest/${id}`)}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm hover:bg-muted"
              >
                <span className="font-medium">
                  {lookup.get(id) ?? t('common.questFallback', { id })}
                </span>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> {t('dashboard.favoritesTitle')}
            </CardTitle>
            <CardDescription>{t('dashboard.favoritesDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {favorites.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('dashboard.noFavorites')}</p>
            )}
            {favorites.map((id) => (
              <Link
                key={id}
                to={withLang(`/quest/${id}`)}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm hover:bg-muted"
              >
                <span className="font-medium">
                  {lookup.get(id) ?? t('common.questFallback', { id })}
                </span>
                <Star className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
