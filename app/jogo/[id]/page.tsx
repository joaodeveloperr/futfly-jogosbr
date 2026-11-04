'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Moon, Radio, Shield, Sun, Users } from 'lucide-react'

type Atleta = { atleta_id: number; nome_popular: string }
type Posicao = { nome: string; sigla: string } | []
type Titular = { atleta: Atleta; camisa: string; ordem: number; posicao: Posicao }
type Escalacao = { esquema_tatico: string; tecnico: { tecnico_id: number; nome_popular: string }; titulares: Titular[]; reservas: Titular[] }
type Estatisticas = { posse_de_bola?: string; escanteios?: number; impedimentos?: number; faltas?: number; passes?: { total: number; completos: number; precisao: string }; finalizacao?: { total: number; no_gol: number; precisao: string }; desarmes?: number }
type MatchDetail = { partida_id: number; status: string; placar: string; time_mandante: { nome_popular: string; escudo: string }; time_visitante: { nome_popular: string; escudo: string }; placar_mandante: number | null; placar_visitante: number | null; data_realizacao_iso: string; campeonato: { nome: string }; estadio: { nome_popular: string } | null; escalacoes?: { mandante: Escalacao; visitante: Escalacao }; estatisticas?: { mandante: Estatisticas; visitante: Estatisticas }; gols?: { mandante: any[]; visitante: any[] }; cartoes?: any }

const statusLabel: Record<string, string> = { 'andamento': 'Ao vivo', 'finalizado': 'Encerrado', 'agendado': 'Em breve', 'pre-jogo': 'Em breve' }

function TeamBadge({ escudo, nome }: { escudo: string; nome: string }) {
  return <img className="detail-crest" src={escudo} alt={`Escudo do ${nome}`} />
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => {
    setDarkMode(window.localStorage.getItem('futfly-theme') === 'dark')
  }, [])
  useEffect(() => { params.then(({ id }) => fetch(`/api/matches/${id}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('Partida não encontrada.'))).then((data) => setMatch(data.match)).catch((reason) => setError(reason.message))) }, [params])

  if (error) return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar aos jogos</Link><div className="detail-empty">{error}</div></main>
  if (!match) return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}><div className="detail-loading">Carregando dados oficiais da partida...</div></main>

  const state = statusLabel[match.status] ?? match.status
  const homeScore = match.placar_mandante
  const awayScore = match.placar_visitante

  return <main className={`detail-page ${darkMode ? 'theme-dark' : ''}`}>
    <header className="detail-header"><Link href="/" className="back-link"><ArrowLeft size={17} /> Jogos</Link><div className="detail-actions"><span className="detail-source"><Radio size={14} /> api-futebol.com.br</span><button className="detail-theme-button" onClick={() => { const nextTheme = !darkMode; setDarkMode(nextTheme); window.localStorage.setItem('futfly-theme', nextTheme ? 'dark' : 'light') }} aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button></div></header>

    <section className="scoreboard"><p className={`detail-status ${state === 'Ao vivo' ? 'live' : ''}`}>{state === 'Ao vivo' && <i />}{state} · {match.campeonato.nome}</p><div className="score-teams"><div className="detail-team"><TeamBadge escudo={match.time_mandante.escudo} nome={match.time_mandante.nome_popular} /><h1>{match.time_mandante.nome_popular}</h1></div><div className="big-score"><strong>{homeScore ?? '—'} : {awayScore ?? '—'}</strong><span>{state === 'Em breve' ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(match.data_realizacao_iso)) : 'Tempo regulamentar'}</span></div><div className="detail-team"><TeamBadge escudo={match.time_visitante.escudo} nome={match.time_visitante.nome_popular} /><h1>{match.time_visitante.nome_popular}</h1></div></div><div className="score-meta"><span><CalendarDays size={15} /> {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(match.data_realizacao_iso))}</span>{match.estadio && <span><MapPin size={15} /> {match.estadio.nome_popular}</span>}</div></section>

    <section className="detail-columns">
      <div className="events-column">
        <div className="detail-section-title"><div><p className="eyebrow">Linha do tempo</p><h2>Eventos da partida</h2></div><Clock3 size={20} /></div>
        {(match.gols?.mandante?.length || match.gols?.visitante?.length) ? (
          <div className="event-timeline">
            {[...(match.gols?.mandante ?? []).map((gol: any) => ({ ...gol, side: 'mandante' })), ...(match.gols?.visitante ?? []).map((gol: any) => ({ ...gol, side: 'visitante' }))].sort((a, b) => {
              const aMin = a.minuto ? parseInt(a.minuto.split(':')[0]) : 0
              const bMin = b.minuto ? parseInt(b.minuto.split(':')[0]) : 0
              return aMin - bMin
            }).map((gol: any, index) => (
              <div className="timeline-event" key={`gol-${index}`}>
                <strong>{gol.minuto ? gol.minuto.split(':')[0] : '—'}&apos;</strong>
                <div className="event-dot" />
                <div>
                  <span>Gol{gol.penalti ? ' (Pênalti)' : ''}{gol.gol_contra ? ' (Contra)' : ''}</span>
                  <p>{gol.atleta.nome_popular}</p>
                  <small>{gol.side === 'mandante' ? match.time_mandante.nome_popular : match.time_visitante.nome_popular}</small>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="detail-empty small">A fonte oficial ainda não retornou eventos para esta partida.</div>}
      </div>

      <aside className="details-aside">
        {match.escalacoes && (
          <div className="detail-info-block">
            <Users size={19} />
            <div>
              <span>Escalações</span>
              <strong>{match.escalacoes.mandante.esquema_tatico} vs {match.escalacoes.visitante.esquema_tatico}</strong>
              <small>Técnicos: {match.escalacoes.mandante.tecnico.nome_popular} / {match.escalacoes.visitante.tecnico.nome_popular}</small>
            </div>
          </div>
        )}

        {match.estatisticas && (
          <div className="detail-info-block">
            <Shield size={19} />
            <div>
              <span>Estatísticas</span>
              <strong>Posse: {match.estatisticas.mandante.posse_de_bola} vs {match.estatisticas.visitante.posse_de_bola}</strong>
              <small>Finalizações: {match.estatisticas.mandante.finalizacao?.total ?? 0} vs {match.estatisticas.visitante.finalizacao?.total ?? 0}</small>
            </div>
          </div>
        )}

        <p className="detail-disclaimer">Dados completos fornecidos pela api-futebol.com.br com escalações, estatísticas e eventos em tempo real.</p>
      </aside>
    </section>
  </main>
}
