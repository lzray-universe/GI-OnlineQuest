import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useAsync } from '../hooks/useAsync'
import { getSiteStats } from '../lib/data'
import { useI18n } from '../lib/i18n'

export const AboutPage = () => {
  const { t, lang, numberFormat } = useI18n()
  const { data: stats } = useAsync((signal) => getSiteStats(lang, signal), [lang])

  useEffect(() => {
    document.title = t('about.title')
  }, [t])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('about.heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('about.subheading')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('about.siteInfoTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {t('about.generatedAt', { value: stats?.generatedAt ?? '--' })}
          </p>
          <p className="text-sm">
            {t('about.totalQuests', {
              value: stats ? numberFormat(stats.totalQuests) : '--',
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Made by</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
            Made by lzray
          </p>
          <p className="text-sm text-muted-foreground">
            This website is made for educational and research purpose
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
