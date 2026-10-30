'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Moon, Radio, Shield, Sun, Users } from 'lucide-react'

type MatchEvent = { type: string; minute?: number; team?: string; player: string }
type Match = { id: number; utcDate: string; status: string; home: { name: string; crest: string | null }; away: { name: string; crest: string | null }; score: { fullTime?: { home: number | null; away: number | null }; halfTime?: { home: number | null; away: number | null }; duration?: string }; league: string; venue?: string; referees?: string[]; events: MatchEvent[] }
const statusLabel: Record<string, string> = { IN_PLAY: 'Ao vivo', PAUSED: 'Intervalo', FINISHED: 'Encerrado', TIMED: 'Em breve', SCHEDULED: 'Em breve' }
function TeamBadge({ team }: { team: Match['home'] }) { return team.crest ? <img className="detail-crest" src={team.crest} alt={`Escudo do ${team.name}`} /> : <div className="detail-crest fallback">{team.name.slice(0, 1)}</div> }

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => {
    setDarkMode(window.localStorage.getItem('futfly-theme') === 'dark')
  }, [])
  useEffect(() => { params.then(({ id }) => fetch(`/api/matches/${id}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('Partida não encontrada.'))).then((data) => setMatch(data.match)).catch((reason) => setError(reason.message))) }, [params])
  if (error) return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar aos jogos</Link><div className="detail-empty">{error}</div></main>
  if (!match) return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}><div className="detail-loading">Carregando dados oficiais da partida...</div></main>
  const state = statusLabel[match.status] ?? match.status
  const homeScore = match.score.fullTime?.home
  const awayScore = match.score.fullTime?.away
  return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}>
    <header className="detail-header"><Link href="/" className="back-link"><ArrowLeft size={17} /> Jogos</Link><div className="detail-actions"><span className="detail-source"><Radio size={14} /> football-data.org</span><button className="detail-theme-button" onClick={() => { const nextTheme = !darkMode; setDarkMode(nextTheme); window.localStorage.setItem('futfly-theme', nextTheme ? 'dark' : 'light') }} aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button></div></header>
    <section className="scoreboard"><p className={`detail-status ${state === 'Ao vivo' ? 'live' : ''}`}>{state === 'Ao vivo' && <i />}{state} · {match.league}</p><div className="score-teams"><div className="detail-team"><TeamBadge team={match.home} /><h1>{match.home.name}</h1></div><div className="big-score"><strong>{homeScore ?? '—'} : {awayScore ?? '—'}</strong><span>{state === 'Em breve' ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(match.utcDate)) : match.score.duration ?? 'Tempo regulamentar'}</span></div><div className="detail-team"><TeamBadge team={match.away} /><h1>{match.away.name}</h1></div></div><div className="score-meta"><span><CalendarDays size={15} /> {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(match.utcDate))}</span>{match.venue && <span><MapPin size={15} /> {match.venue}</span>}</div></section>
    <section className="detail-columns"><div className="events-column"><div className="detail-section-title"><div><p className="eyebrow">Linha do tempo</p><h2>Eventos da partida</h2></div><Clock3 size={20} /></div>{match.events.length ? <div className="event-timeline">{match.events.map((event, index) => <div className="timeline-event" key={`${event.type}-${event.minute}-${index}`}><strong>{event.minute ?? '—'}&apos;</strong><div className="event-dot" /><div><span>{event.type === 'goal' ? 'Gol' : event.type === 'card' ? 'Cartão' : event.type}</span><p>{event.player}</p><small>{event.team ?? 'Equipe não informada'}</small></div></div>)}</div> : <div className="detail-empty small">A fonte oficial ainda não retornou eventos para esta partida.</div>}</div><aside className="details-aside"><div className="detail-info-block"><Users size={19} /><div><span>Escalações e jogadores</span><strong>Não disponibilizado pela fonte</strong></div></div><div className="detail-info-block"><Shield size={19} /><div><span>Arbitragem</span><strong>{match.referees?.length ? match.referees.join(', ') : 'Não informado'}</strong></div></div><p className="detail-disclaimer">Exibimos somente informações retornadas pela football-data.org. Coordenadas de lances e escalações não fazem parte do plano atual da API, então não inventamos esses dados.</p></aside></section>
  </main>
}
