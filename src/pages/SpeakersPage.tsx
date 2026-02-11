import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAsync } from '../hooks/useAsync'
import { getSpeakersIndex } from '../lib/data'
import { useI18n } from '../lib/i18n'

export const SpeakersPage = () => {
  const { t, lang, withLang, numberFormat } = useI18n()
  const { data: speakersIndex, error } = useAsync(
    (signal) => getSpeakersIndex(lang, signal),
    [lang]
  )
  const [query, setQuery] = useState('')

  useEffect(() => {
    document.title = t('speakers.title')
  }, [t])

  const speakers = useMemo(() => {
    const list = speakersIndex?.speakers ?? []
    if (!query) return list
    return list.filter((speaker) => speaker.name.includes(query))
  }, [speakersIndex, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('speakers.heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('speakers.subheading')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> {t('speakers.searchLabel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t('speakers.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {t('speakers.loadError')}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {speakers.map((speaker) => (
          <Link
            key={speaker.id}
            to={withLang(`/speakers/${speaker.id}`)}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 shadow-soft"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{speaker.name}</p>
                <p className="text-xs text-muted-foreground">ID: {speaker.id}</p>
              </div>
            </div>
            <p className="text-sm font-semibold">
              {t('speakers.lineCount', { count: numberFormat(speaker.count) })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
