import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { useI18n } from '../lib/i18n'

export const NotFoundPage = () => {
  const { t, withLang } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-3xl font-semibold">{t('notFound.heading')}</h1>
      <p className="text-sm text-muted-foreground">{t('notFound.body')}</p>
      <Button asChild>
        <Link to={withLang('/')}>{t('notFound.backHome')}</Link>
      </Button>
    </div>
  )
}
