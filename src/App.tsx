import type { ReactElement } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { RegionPage } from './pages/RegionPage'
import { TypePage } from './pages/TypePage'
import { QuestsPage } from './pages/QuestsPage'
import { ChapterPage } from './pages/ChapterPage'
import { QuestDetailPage } from './pages/QuestDetailPage'
import { QuestReaderPage } from './pages/QuestReaderPage'
import { SpeakersPage } from './pages/SpeakersPage'
import { SpeakerDetailPage } from './pages/SpeakerDetailPage'
import { StudyHomePage } from './pages/StudyHomePage'
import { StudyQuestPage } from './pages/StudyQuestPage'
import { StudyVocabPage } from './pages/StudyVocabPage'
import { AboutPage } from './pages/AboutPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { I18nProvider } from './lib/i18n'
import { PlayerTextSettingsProvider } from './lib/playerTextSettings'

const SUPPORTED_LANGS = new Set(['en', 'ja'])

function LangGuard({ children }: { children: ReactElement }) {
  const { lang } = useParams()
  const location = useLocation()

  const raw = (lang ?? '').trim()
  const normalized = raw.toLowerCase()

  if (!raw || !SUPPORTED_LANGS.has(normalized)) {
    return <NotFoundPage />
  }


  if (raw !== normalized) {
    const parts = location.pathname.split('/')
    // pathname 形如: "/EN/quests" => ["", "EN", "quests"]
    if (parts.length >= 2) parts[1] = normalized
    const targetPath = parts.join('/')
    return <Navigate to={`${targetPath}${location.search}${location.hash}`} replace />
  }

  return children
}

const layoutRoutes = (homeTo: string) => (
  <>
    <Route index element={<DashboardPage />} />
    <Route path="chapter/:chapterId" element={<ChapterPage />} />
    <Route path="region/:regionKey" element={<RegionPage />} />
    <Route path="type/:questType" element={<TypePage />} />
    <Route path="quests" element={<QuestsPage />} />
    <Route path="quest/:id" element={<QuestDetailPage />} />
    <Route path="study" element={<StudyHomePage />} />
    <Route path="study/quest/:id" element={<StudyQuestPage />} />
    <Route path="study/vocab" element={<StudyVocabPage />} />
    <Route path="speakers" element={<SpeakersPage />} />
    <Route path="speakers/:speakerId" element={<SpeakerDetailPage />} />
    <Route path="about" element={<AboutPage />} />
    <Route path="home" element={<Navigate to={homeTo} replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </>
)

const App = () => {
  return (
    <I18nProvider>
      <PlayerTextSettingsProvider>
        <Routes>

          <Route path="/quest/:id/reader" element={<QuestReaderPage />} />
          <Route
            path="/:lang/quest/:id/reader"
            element={
              <LangGuard>
                <QuestReaderPage />
              </LangGuard>
            }
          />

          <Route path="/" element={<AppLayout />}>
            {layoutRoutes('/')}
          </Route>


          <Route
            path="/:lang"
            element={
              <LangGuard>
                <AppLayout />
              </LangGuard>
            }
          >
            {layoutRoutes('.')}
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PlayerTextSettingsProvider>
    </I18nProvider>
  )
}

export default App
