'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Moon, Radio, Shield, Sun, Users } from 'lucide-react'

type Player = { name: string; number: number | null; pos: string | null }
type Lineup = { formation: string | null; coach: string | null; starters: Player[]; substitutes: Player[] } | null
type Side = { name: string; crest: string | null }
type MatchEvent = { type: 'goal' | 'card' | 'subst' | 'var'; detail: string; minute: number | null; extra: number | null; side: 'home' | 'away'; team: string; player: string; assist: string | null }
type Stats = Record<string, string | number | null>
type MatchDetail = {
  id: number; utcDate: string; status: string; statusLong: string; minute: number | null; league: string; round: string | null
  venue: { name: string; city: string | null } | null
  home: Side; away: Side
  score: { home: number | null; away: number | null; penalty: { home: number; away: number } | null }
  events: MatchEvent[]
  lineups: { home: Lineup; away: Lineup } | null
  stats: { home: Stats; away: Stats } | null
}

const statusLabel: Record<string, string> = { IN_PLAY: 'Ao vivo', PAUSED: 'Intervalo', FINISHED: 'Encerrado', TIMED: 'Em breve', POSTPONED: 'Adiado', SUSPENDED: 'Suspenso', CANCELLED: 'Cancelado' }

function eventTitle(event: MatchEvent) {
  if (event.type === 'goal') return event.detail === 'Penalty' ? 'Gol (Pênalti)' : event.detail === 'Own Goal' ? 'Gol (Contra)' : 'Gol'
  if (event.type === 'card') return event.detail === 'Red Card' ? 'Cartão vermelho' : 'Cartão amarelo'
  if (event.type === 'subst') return 'Substituição'
  return 'VAR'
}

function TeamBadge({ team }: { team: Side }) {
  return team.crest ? <img className="detail-crest" src={team.crest} alt={`Escudo do ${team.name}`} /> : <div className="detail-crest">{team.name.slice(0, 1)}</div>
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => {
    setDarkMode(window.localStorage.getItem('futfly-theme') === 'dark')
  }, [])
  useEffect(() => {
    params.then(({ id }) => fetch(`/api/matches/${id}`)
      .then(async (response) => { const body = await response.json().catch(() => null); return response.ok ? body : Promise.reject(new Error(body?.error ?? 'Não foi possível carregar a partida.')) })
      .then((data) => setMatch(data.match))
      .catch((reason) => setError(reason.message)))
  }, [params])

  if (error) return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar aos jogos</Link><div className="detail-empty">{error}</div></main>
  if (!match) return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}><div className="detail-loading">Carregando dados da partida...</div></main>

  const state = statusLabel[match.status] ?? match.status
  const homeScore = match.score.home
  const awayScore = match.score.away
  const kickoff = new Date(match.utcDate)
  const sortedEvents = [...match.events].filter((e) => e.type !== 'var').sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.extra ?? 0) - (b.extra ?? 0))
  const { stats, lineups } = match

  return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}>
    <header className="detail-header"><Link href="/" className="back-link"><ArrowLeft size={17} /> Jogos</Link><div className="detail-actions"><span className="detail-source"><Radio size={14} /> API-Sports</span><button className="detail-theme-button" onClick={() => { const nextTheme = !darkMode; setDarkMode(nextTheme); window.localStorage.setItem('futfly-theme', nextTheme ? 'dark' : 'light') }} aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button></div></header>

    <section className="scoreboard"><p className={`detail-status ${state === 'Ao vivo' ? 'live' : ''}`}>{state === 'Ao vivo' && <i />}{state} · {match.league}</p><div className="score-teams"><div className="detail-team"><TeamBadge team={match.home} /><h1>{match.home.name}</h1></div><div className="big-score"><strong>{homeScore ?? '—'} : {awayScore ?? '—'}</strong><span>{state === 'Em breve' ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(kickoff) : state === 'Ao vivo' && match.minute ? `${match.minute}'` : match.score.penalty ? `Pênaltis ${match.score.penalty.home} x ${match.score.penalty.away}` : match.statusLong}</span></div><div className="detail-team"><TeamBadge team={match.away} /><h1>{match.away.name}</h1></div></div><div className="score-meta"><span><CalendarDays size={15} /> {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(kickoff)}</span>{match.venue && <span><MapPin size={15} /> {match.venue.name}{match.venue.city ? `, ${match.venue.city}` : ''}</span>}</div></section>

    <section className="detail-columns">
      <div className="events-column">
        <div className="detail-section-title"><div><p className="eyebrow">Linha do tempo</p><h2>Eventos da partida</h2></div><Clock3 size={20} /></div>
        {sortedEvents.length ? (
          <div className="event-timeline">
            {sortedEvents.map((event, index) => (
              <div className="timeline-event" key={`${event.type}-${event.minute}-${event.player}-${index}`}>
                <strong>{event.minute ?? '—'}{event.extra ? `+${event.extra}` : ''}&apos;</strong>
                <div className="event-dot" />
                <div>
                  <span>{eventTitle(event)}</span>
                  <p>{event.player}{event.type === 'subst' && event.assist ? ` ⇄ ${event.assist}` : ''}</p>
                  <small>{event.team}</small>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="detail-empty small">Ainda não há eventos para esta partida.</div>}
      </div>

      <aside className="details-aside">
        {lineups && (
          <div className="detail-info-block">
            <Users size={19} />
            <div>
              <span>Escalações</span>
              <strong>{lineups.home?.formation ?? '—'} vs {lineups.away?.formation ?? '—'}</strong>
              <small>Técnicos: {lineups.home?.coach ?? '—'} / {lineups.away?.coach ?? '—'}</small>
            </div>
          </div>
        )}

        {stats && (
          <div className="detail-info-block">
            <Shield size={19} />
            <div>
              <span>Estatísticas</span>
              <strong>Posse: {stats.home.possession ?? '—'} vs {stats.away.possession ?? '—'}</strong>
              <small>Finalizações: {stats.home.shots ?? 0} vs {stats.away.shots ?? 0} · No gol: {stats.home.shotsOnTarget ?? 0} vs {stats.away.shotsOnTarget ?? 0}</small>
              <small>Escanteios: {stats.home.corners ?? 0} vs {stats.away.corners ?? 0} · Faltas: {stats.home.fouls ?? 0} vs {stats.away.fouls ?? 0}</small>
            </div>
          </div>
        )}

        <p className="detail-disclaimer">Dados fornecidos pela API-Sports. Escalações e estatísticas aparecem quando a fonte as disponibiliza.</p>
      </aside>
    </section>
  </main>
}
