'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarDays, ChevronDown, Clock3, Filter, Flame, Menu, Moon, Search, Settings2, Star, Sun, Trophy, X } from 'lucide-react'

type MatchEvent = { type: string; minute?: number; team?: string; player: string }
type Match = { id: number; utcDate: string; status: string; minute?: number | null; home: { name: string; crest: string | null }; away: { name: string; crest: string | null }; score: { fullTime?: { home: number | null; away: number | null }; duration?: string }; league: string; events: MatchEvent[] }

const statusLabel: Record<string, string> = { IN_PLAY: 'Ao vivo', PAUSED: 'Intervalo', FINISHED: 'Encerrado', TIMED: 'Em breve', SCHEDULED: 'Em breve', POSTPONED: 'Adiado', SUSPENDED: 'Suspenso', CANCELLED: 'Cancelado' }

function formatTime(date: string) { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)) }

function TeamBadge({ team }: { team: Match['home'] }) {
  return team.crest ? <img className="team-badge crest" src={team.crest} alt={`Escudo do ${team.name}`} /> : <div className="team-badge">{team.name.slice(0, 1)}</div>
}

export default function Page() {
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshSeconds, setRefreshSeconds] = useState(180)
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default')
  const previousMatches = useRef<Match[] | null>(null)

  useEffect(() => {
    setDarkMode(window.localStorage.getItem('futfly-theme') === 'dark')
  }, [])

  useEffect(() => {
    if ('Notification' in window) setNotificationStatus(Notification.permission)

    let timer: number | undefined
    let cancelled = false
    let lastLoad = 0

    const loadMatches = async () => {
      let nextDelay = 180
      try {
        const response = await fetch('/api/matches')
        const data = await response.json().catch(() => null)
        if (!response.ok || !data) throw new Error(data?.notice?.message ?? 'Não foi possível consultar os jogos.')
        if (cancelled) return

        nextDelay = Math.max(60, Number(data.ttlSeconds) || Number(data.retryAfterSeconds) || 180)
        setRefreshSeconds(Number(data.ttlSeconds) || 180)
        setError('')

        if (data.notice) {
          // A fonte falhou (ex.: limite diário). Mantém os jogos que já estavam na tela.
          setNotice(data.notice.message)
          nextDelay = Math.max(nextDelay, 300)
        } else {
          setNotice(data.stale ? 'Mostrando os últimos dados disponíveis; a fonte está temporariamente indisponível.' : '')
          const nextMatches = data.matches as Match[]
          const previous = previousMatches.current
          if (previous && 'Notification' in window && Notification.permission === 'granted') {
            const changed = nextMatches.flatMap((match) => {
              const oldMatch = previous.find((item) => item.id === match.id)
              const oldEvents = new Set((oldMatch?.events ?? []).map((event) => `${event.type}-${event.minute}-${event.player}`))
              return match.events.filter((event) => !oldEvents.has(`${event.type}-${event.minute}-${event.player}`)).map((event) => `${match.home.name} x ${match.away.name}: ${event.type === 'goal' ? 'Gol' : 'Cartão'}${event.player ? ` — ${event.player}` : ''}`)
            })
            changed.slice(0, 3).forEach((body) => new Notification('Atualização no jogo', { body, icon: '/favicon.ico' }))
          }
          previousMatches.current = nextMatches
          setMatches(nextMatches)
        }
        lastLoad = Date.now()
      } catch (loadError) {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar partidas.')
        nextDelay = 300
      } finally {
        if (!cancelled) {
          setLoading(false)
          schedule(nextDelay)
        }
      }
    }

    // Só atualiza com a aba visível, para não gastar o limite da API à toa.
    const schedule = (seconds: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => { if (document.visibilityState === 'visible') loadMatches(); else schedule(seconds) }, seconds * 1000)
    }
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastLoad > 180000) { window.clearTimeout(timer); loadMatches() } }

    document.addEventListener('visibilitychange', onVisible)
    loadMatches()
    return () => { cancelled = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setNotificationStatus(permission)
  }

  const visible = matches.filter((match) => {
    const state = statusLabel[match.status] ?? match.status
    const byFilter = filter === 'Todos' || (filter === 'Ao vivo' && ['Ao vivo', 'Intervalo'].includes(state)) || (filter === 'Próximos' && state === 'Em breve') || (filter === 'Encerrados' && state === 'Encerrado')
    const bySearch = `${match.home.name} ${match.away.name} ${match.league}`.toLowerCase().includes(search.toLowerCase())
    return byFilter && bySearch
  })

  return (
    <main className={`app-shell ${darkMode ? 'theme-dark' : ''}`}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Trophy size={19} strokeWidth={2.5} /></span><span>Fut<span>Fly</span></span></div>
        <nav className="main-nav" aria-label="Navegação principal"><a className="active" href="#jogos">Jogos</a><a href="#competicoes">Competições</a><a href="#times">Meus times</a></nav>
        <div className="top-actions"><button className="icon-button" onClick={() => { const nextTheme = !darkMode; setDarkMode(nextTheme); window.localStorage.setItem('futfly-theme', nextTheme ? 'dark' : 'light') }} aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}>{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button><button className={`icon-button ${notificationStatus === 'granted' ? 'is-enabled' : ''}`} onClick={requestNotifications} aria-label="Ativar notificações"><Bell size={19} /></button><button className="avatar" aria-label="Perfil">MS</button><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={22} /></button></div>
      </header>
      {menuOpen && <div className="mobile-nav"><a href="#jogos">Jogos</a><a href="#competicoes">Competições</a><a href="#times">Meus times</a></div>}

      <div className="content-wrap">
        <section className="hero-row"><div><p className="eyebrow"><span className="live-pulse" /> Acompanhe em tempo real</p><h1>O jogo acontece<br /><em>aqui.</em></h1><p className="hero-copy">Todos os placares, horários e lances do futebol em um só lugar.</p></div><div className="hero-stat"><span>FONTE OFICIAL</span><strong>API-Sports</strong><small>Atualização automática a cada {Math.round(refreshSeconds / 60)} min</small></div></section>

        <section className="toolbar" id="jogos"><div className="tabs" role="tablist">{['Todos', 'Ao vivo', 'Próximos', 'Encerrados'].map((item) => <button key={item} className={filter === item ? 'tab active' : 'tab'} onClick={() => setFilter(item)}>{item}{item === 'Ao vivo' && <span className="tab-dot" />}</button>)}</div><div className="toolbar-actions"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar time ou campeonato" aria-label="Buscar time ou campeonato" />{search && <button onClick={() => setSearch('')} aria-label="Limpar busca"><X size={14} /></button>}</label><button className="filter-button"><Filter size={16} /> Filtros <ChevronDown size={15} /></button></div></section>

        <div className="section-heading"><div><h2>Partidas de hoje</h2><p>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())} <span>•</span> {matches.length} jogos encontrados</p></div><button className="calendar-button"><CalendarDays size={17} /> Calendário</button></div>
        <section className="match-grid">{visible.map((match) => { const state = statusLabel[match.status] ?? match.status; const homeScore = match.score.fullTime?.home; const awayScore = match.score.fullTime?.away; return <article className={`match-card ${state === 'Ao vivo' ? 'is-live' : ''}`} key={match.id} onClick={() => router.push(`/jogo/${match.id}`)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') router.push(`/jogo/${match.id}`) }}><div className="match-meta"><span className={state === 'Ao vivo' ? 'status live' : state === 'Encerrado' ? 'status ended' : 'status upcoming'}>{state === 'Ao vivo' && <i />}{state}</span><span>{match.league}</span>{state === 'Ao vivo' && <Flame className="hot" size={15} fill="currentColor" />}</div><div className="match-teams"><div className="club"><TeamBadge team={match.home} /><strong>{match.home.name}</strong></div><div className="score"><b>{homeScore ?? formatTime(match.utcDate)}</b>{homeScore !== null && homeScore !== undefined && <span>:</span>}<b>{awayScore ?? ''}</b></div><div className="club away"><TeamBadge team={match.away} /><strong>{match.away.name}</strong></div></div><div className="match-footer"><span><Clock3 size={14} /> {state === 'Ao vivo' ? (match.minute ? `${match.minute}'` : 'Em andamento') : state === 'Intervalo' ? 'Intervalo' : state === 'Encerrado' ? 'Finalizado' : ['Adiado', 'Suspenso', 'Cancelado'].includes(state) ? state : `Hoje, ${formatTime(match.utcDate)}`}</span><button aria-label={`Favoritar ${match.home.name} e ${match.away.name}`}><Star size={17} /></button></div></article> })}</section>
        {loading && <div className="empty-state">Consultando partidas reais...</div>}
        {!loading && (error || notice) && <div className="empty-state" role="status">{error || notice}</div>}
        {!loading && !error && !notice && visible.length === 0 && <div className="empty-state">{matches.length === 0 ? 'Nenhum jogo encontrado para hoje.' : 'Nenhum jogo encontrado para sua busca.'}</div>}

        <section className="updates-layout"><div className="updates-panel"><div className="section-heading compact"><div><h2>Últimas atualizações</h2><p>Gols e cartões retornados pela API-Sports</p></div></div><div className="updates-list">{matches.flatMap((match) => match.events.map((event) => <div className="update-item" key={`${match.id}-${event.type}-${event.minute}-${event.player}`}><div className="update-time">{event.minute ?? '—'}&apos;</div><div className="update-line" /><div className="update-content"><span className="update-tag">{event.type === 'goal' ? 'Gol' : 'Cartão'} · {event.team}</span><h3>{event.player}</h3><p>{match.home.name} x {match.away.name}</p></div></div>))}</div>{!loading && matches.every((match) => match.events.length === 0) && <p className="modal-note">Nenhum evento foi retornado pela fonte para os jogos disponíveis.</p>}</div><aside className="follow-card"><div className="follow-icon"><Bell size={18} /></div><h2>Atualização automática</h2><p>O FutFly consulta a fonte oficial a cada {Math.round(refreshSeconds / 60)} minutos enquanto a aba está aberta.</p><button onClick={notificationStatus === 'granted' ? () => window.location.reload() : requestNotifications}>{notificationStatus === 'granted' ? 'Atualizar agora' : 'Ativar notificações'} <span>→</span></button></aside></section>
      </div>
      <footer><span>© 2024 FutFly</span><span>Feito para quem vive o futebol.</span><span className="footer-links"><a href="#sobre">Sobre o FutFly</a><a href="#ajuda">Ajuda</a><Settings2 size={15} /></span></footer>
    </main>
  )
}

