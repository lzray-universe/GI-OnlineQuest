import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Compass,
  GraduationCap,
  Home,
  Info,
  Menu,
  Search,
  Star,
  User,
} from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { getLanguageConfig } from '../../lib/languages'
import { cn } from '../../lib/utils'
import { usePlayerTextSettings } from '../../lib/playerTextSettings'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FontSelector } from './FontSelector'
import { ThemeToggle } from './ThemeToggle'

export const AppLayout = ({ children }: { children?: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const location = useLocation()
  const { t, withLang, lang, stripLang } = useI18n()
  const { settings, updateSettings, resetSettings } = usePlayerTextSettings()
  const config = getLanguageConfig(lang)

  const navItems = useMemo(
    () => [
      { label: t('nav.home'), icon: Home, to: '/', match: '/' },
      { label: t('nav.quests'), icon: Search, to: '/quests', match: '/quests' },
      { label: t('nav.study'), icon: GraduationCap, to: '/study', match: '/study' },
      {
        label: t('nav.region'),
        icon: Compass,
        to: `/region/${encodeURIComponent(config.defaultRegion)}`,
        match: '/region',
      },
      { label: t('nav.type'), icon: BookOpen, to: '/type/WQ', match: '/type' },
      { label: t('nav.speakers'), icon: User, to: '/speakers', match: '/speakers' },
      { label: t('nav.favorites'), icon: Star, to: '/quests?favorites=1', match: '/quests' },
      { label: t('nav.about'), icon: Info, to: '/about', match: '/about' },
    ],
    [config.defaultRegion, t]
  )

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!settingsOpen) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setSettingsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  const currentLabel = useMemo(() => {
    const currentPath = stripLang(location.pathname)
    return navItems.find((item) => currentPath.startsWith(item.match ?? item.to.split('?')[0]))
      ?.label
  }, [location.pathname, navItems, stripLang])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={t('layout.openSidebar')}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to={withLang('/')} className="flex items-center gap-2 font-semibold">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">OnlineQuest</p>
                <p className="text-lg font-semibold">{t('layout.siteTagline')}</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-muted-foreground lg:block">
              {currentLabel ?? t('layout.fallbackLabel')}
            </div>
            <div className="relative">
              <Button
                ref={buttonRef}
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-label="玩家文本设置"
              >
                <User className="h-5 w-5" />
              </Button>
              {settingsOpen && (
                <div
                  ref={panelRef}
                  className="absolute right-0 top-12 z-50 w-72 space-y-4 rounded-xl border border-border bg-background p-4 shadow-lg"
                >
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="player-name">
                      玩家名字
                    </label>
                    <Input
                      id="player-name"
                      value={settings.playerName}
                      onChange={(event) => updateSettings({ playerName: event.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">玩家性别</p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant={settings.playerGender === 'M' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateSettings({ playerGender: 'M' })}
                      >
                        男
                      </Button>
                      <Button
                        variant={settings.playerGender === 'F' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateSettings({ playerGender: 'F' })}
                      >
                        女
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="realname-id2">
                      小龙名字
                    </label>
                    <Input
                      id="realname-id2"
                      value={settings.realnameId2}
                      onChange={(event) => updateSettings({ realnameId2: event.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="realname-id1">
                      流浪者新名字
                    </label>
                    <Input
                      id="realname-id1"
                      value={settings.realnameId1}
                      onChange={(event) => updateSettings({ realnameId1: event.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={resetSettings}>
                    恢复默认
                  </Button>
                </div>
              )}
            </div>
            <FontSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-background/95 p-6 backdrop-blur transition-transform lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <nav className="mt-20 flex flex-col gap-2 lg:mt-6">
            {navItems.map((item) => {
              const Icon = item.icon
              const currentPath = stripLang(location.pathname)
              const isActive = currentPath.startsWith(item.match ?? item.to.split('?')[0])
              return (
                <Link
                  key={item.label}
                  to={withLang(item.to)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/80 hover:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-10 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{t('layout.tipTitle')}</p>
            <p className="mt-2">{t('layout.tipBody')}</p>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 px-4 py-8 lg:px-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children ?? <Outlet />}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
