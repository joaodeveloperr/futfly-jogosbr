'use client'

import { useState } from 'react'
import { Bell, CalendarDays, ChevronDown, Clock3, Filter, Flame, Menu, Search, Settings2, Star, Trophy, X } from 'lucide-react'

type Match = { id: number; time: string; state: string; home: string; away: string; homeScore?: number; awayScore?: number; league: string; color: string; hot?: boolean }

const matches: Match[] = [
  { id: 1, time: '18:30', state: 'Ao vivo', home: 'Flamengo', away: 'Palmeiras', homeScore: 2, awayScore: 1, league: 'Brasileirão', color: '#e63946', hot: true },
  { id: 2, time: '20:00', state: 'Em breve', home: 'Manchester City', away: 'Real Madrid', league: 'Champions League', color: '#4b7bec' },
  { id: 3, time: '20:30', state: 'Em breve', home: 'Corinthians', away: 'São Paulo', league: 'Paulistão', color: '#252525' },
  { id: 4, time: '21:00', state: 'Em breve', home: 'Barcelona', away: 'Atlético de Madrid', league: 'La Liga', color: '#7b2cbf' },
  { id: 5, time: '16:00', state: 'Encerrado', home: 'Liverpool', away: 'Arsenal', homeScore: 3, awayScore: 3, league: 'Premier League', color: '#d62828' },
]

const updates = [
  { minute: '68’', title: 'Gol do Flamengo!', text: 'Pedro marcou de cabeça após cruzamento de Arrascaeta.', team: 'Flamengo', color: '#e63946' },
  { minute: '52’', title: 'Cartão amarelo', text: 'Mayke recebe cartão por falta dura no meio-campo.', team: 'Palmeiras', color: '#31a852' },
  { minute: 'INTERVALO', title: 'Fim do primeiro tempo', text: 'Flamengo vai vencendo por 2 a 1 no Maracanã.', team: 'Flamengo', color: '#e63946' },
]

function TeamBadge({ name, color }: { name: string; color: string }) {
  return <div className="team-badge" style={{ '--team-color': color } as React.CSSProperties}>{name.slice(0, 1)}</div>
}

export default function Page() {
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const visible = matches.filter((match) => {
    const byFilter = filter === 'Todos' || (filter === 'Ao vivo' && match.state === 'Ao vivo') || (filter === 'Próximos' && match.state === 'Em breve') || (filter === 'Encerrados' && match.state === 'Encerrado')
    const bySearch = `${match.home} ${match.away} ${match.league}`.toLowerCase().includes(search.toLowerCase())
    return byFilter && bySearch
  })

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Trophy size={19} strokeWidth={2.5} /></span><span>Fut<span>Fly</span></span></div>
        <nav className="main-nav" aria-label="Navegação principal"><a className="active" href="#jogos">Jogos</a><a href="#competicoes">Competições</a><a href="#times">Meus times</a></nav>
        <div className="top-actions"><button className="icon-button" aria-label="Notificações"><Bell size={19} /></button><button className="avatar" aria-label="Perfil">MS</button><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={22} /></button></div>
      </header>
      {menuOpen && <div className="mobile-nav"><a href="#jogos">Jogos</a><a href="#competicoes">Competições</a><a href="#times">Meus times</a></div>}

      <div className="content-wrap">
        <section className="hero-row"><div><p className="eyebrow"><span className="live-pulse" /> Acompanhe em tempo real</p><h1>O jogo acontece<br /><em>aqui.</em></h1><p className="hero-copy">Todos os placares, horários e lances do futebol em um só lugar.</p></div><div className="hero-ball" aria-hidden="true">⚽</div></section>

        <section className="toolbar" id="jogos"><div className="tabs" role="tablist">{['Todos', 'Ao vivo', 'Próximos', 'Encerrados'].map((item) => <button key={item} className={filter === item ? 'tab active' : 'tab'} onClick={() => setFilter(item)}>{item}{item === 'Ao vivo' && <span className="tab-dot" />}</button>)}</div><div className="toolbar-actions"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar time ou campeonato" aria-label="Buscar time ou campeonato" />{search && <button onClick={() => setSearch('')} aria-label="Limpar busca"><X size={14} /></button>}</label><button className="filter-button"><Filter size={16} /> Filtros <ChevronDown size={15} /></button></div></section>

        <div className="section-heading"><div><h2>Partidas de hoje</h2><p>Terça-feira, 29 de outubro <span>•</span> 12 jogos</p></div><button className="calendar-button"><CalendarDays size={17} /> Calendário</button></div>
        <section className="match-grid">{visible.map((match) => <article className={`match-card ${match.state === 'Ao vivo' ? 'is-live' : ''}`} key={match.id}><div className="match-meta"><span className={match.state === 'Ao vivo' ? 'status live' : match.state === 'Encerrado' ? 'status ended' : 'status upcoming'}>{match.state === 'Ao vivo' && <i />}{match.state}</span><span>{match.league}</span>{match.hot && <Flame className="hot" size={15} fill="currentColor" />}</div><div className="match-teams"><div className="club"><TeamBadge name={match.home} color={match.color} /><strong>{match.home}</strong></div><div className="score"><b>{match.homeScore ?? match.time}</b>{match.homeScore !== undefined && <span>:</span>}<b>{match.awayScore ?? ''}</b></div><div className="club away"><TeamBadge name={match.away} color={match.color} /><strong>{match.away}</strong></div></div><div className="match-footer"><span><Clock3 size={14} /> {match.state === 'Ao vivo' ? '2º tempo · 68 min' : match.state === 'Encerrado' ? 'Finalizado' : `Hoje, ${match.time}`}</span><button aria-label={`Favoritar ${match.home} e ${match.away}`}><Star size={17} /></button></div></article>)}</section>
        {visible.length === 0 && <div className="empty-state">Nenhum jogo encontrado para sua busca.</div>}

        <section className="updates-layout"><div className="updates-panel"><div className="section-heading compact"><div><h2>Últimas atualizações</h2><p>O que está acontecendo agora</p></div><a href="#atualizacoes">Ver tudo <span>→</span></a></div><div className="updates-list">{updates.map((update) => <div className="update-item" key={update.minute + update.title}><div className="update-time">{update.minute}</div><div className="update-line" style={{ '--update-color': update.color } as React.CSSProperties} /><div className="update-content"><span className="update-tag" style={{ color: update.color, backgroundColor: `${update.color}12` }}>{update.team}</span><h3>{update.title}</h3><p>{update.text}</p></div></div>)}</div></div><aside className="follow-card"><div className="follow-icon"><Bell size={18} /></div><h2>Não perca nenhum lance</h2><p>Receba alertas dos seus times favoritos direto no celular.</p><button>Escolher meus times <span>→</span></button></aside></section>
      </div>
      <footer><span>© 2024 FutFly</span><span>Feito para quem vive o futebol.</span><span className="footer-links"><a href="#sobre">Sobre o FutFly</a><a href="#ajuda">Ajuda</a><Settings2 size={15} /></span></footer>
    </main>
  )
}

