// Normalização dos dados da API-Sports para o formato que o front usa.

export const TIMEZONE = 'America/Sao_Paulo'

export type MatchStatus = 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED'

export function normalizeStatus(short: string | undefined): MatchStatus {
  switch (short) {
    case '1H': case '2H': case 'ET': case 'BT': case 'P': case 'LIVE': case 'INT':
      return 'IN_PLAY'
    case 'HT':
      return 'PAUSED'
    case 'FT': case 'AET': case 'PEN':
      return 'FINISHED'
    case 'PST':
      return 'POSTPONED'
    case 'SUSP':
      return 'SUSPENDED'
    case 'CANC': case 'ABD': case 'AWD': case 'WO':
      return 'CANCELLED'
    default: // NS, TBD e desconhecidos
      return 'TIMED'
  }
}

export const isLive = (status: MatchStatus) => status === 'IN_PLAY' || status === 'PAUSED'

/** Data de hoje (YYYY-MM-DD) no fuso do Brasil, independente do fuso do servidor. */
export function todayInBrazil(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Ligas mostradas primeiro (IDs da API-Sports). Pode ser sobrescrito com a env LEAGUE_IDS.
const DEFAULT_PRIORITY = [71, 72, 73, 13, 11, 2, 3, 1, 39, 140, 135, 78, 61]

export function priorityLeagues(): number[] {
  const custom = (process.env.LEAGUE_IDS ?? '').split(',').map((v) => Number(v.trim())).filter(Boolean)
  return custom.length ? custom : DEFAULT_PRIORITY
}

function eventList(events: any, homeId: number | undefined) {
  if (!Array.isArray(events)) return []
  return events
    .filter((e: any) => e?.type === 'Goal' ? e.detail !== 'Missed Penalty' : e?.type === 'Card' || e?.type === 'subst' || e?.type === 'Var')
    .map((e: any) => ({
      type: e.type === 'Goal' ? 'goal' : e.type === 'Card' ? 'card' : e.type === 'subst' ? 'subst' : 'var',
      detail: e.detail ?? '',
      minute: e.time?.elapsed ?? null,
      extra: e.time?.extra ?? null,
      side: e.team?.id === homeId ? 'home' : 'away',
      team: e.team?.name ?? '',
      player: e.player?.name ?? '',
      assist: e.assist?.name ?? null,
    }))
}

/** Item da lista (home). */
export function normalizeFixture(item: any) {
  const homeId = item?.teams?.home?.id
  return {
    id: item.fixture.id as number,
    utcDate: item.fixture.date as string,
    status: normalizeStatus(item.fixture?.status?.short),
    minute: item.fixture?.status?.elapsed ?? null,
    home: { name: item?.teams?.home?.name ?? 'Mandante', crest: item?.teams?.home?.logo ?? null },
    away: { name: item?.teams?.away?.name ?? 'Visitante', crest: item?.teams?.away?.logo ?? null },
    score: { fullTime: { home: item?.goals?.home ?? null, away: item?.goals?.away ?? null } },
    league: item?.league?.name ?? '',
    leagueId: item?.league?.id ?? null,
    venue: item?.fixture?.venue?.name ?? null,
    events: eventList(item?.events, homeId).filter((e: any) => e.type === 'goal' || e.type === 'card'),
  }
}

const STAT_KEYS: Record<string, string> = {
  'Ball Possession': 'possession',
  'Total Shots': 'shots',
  'Shots on Goal': 'shotsOnTarget',
  'Corner Kicks': 'corners',
  'Fouls': 'fouls',
  'Offsides': 'offsides',
  'Yellow Cards': 'yellowCards',
  'Red Cards': 'redCards',
}

/** Detalhe de uma partida (`/fixtures?id=`). */
export function normalizeDetail(item: any) {
  const homeId = item?.teams?.home?.id
  const awayId = item?.teams?.away?.id

  const stats: Record<'home' | 'away', Record<string, string | number | null>> = { home: {}, away: {} }
  for (const block of Array.isArray(item?.statistics) ? item.statistics : []) {
    const side = block?.team?.id === homeId ? 'home' : block?.team?.id === awayId ? 'away' : null
    if (!side) continue
    for (const stat of block.statistics ?? []) {
      const key = STAT_KEYS[stat?.type]
      if (key) stats[side][key] = stat.value ?? null
    }
  }

  const lineup = (side: 'home' | 'away') => {
    const teamId = side === 'home' ? homeId : awayId
    const found = (Array.isArray(item?.lineups) ? item.lineups : []).find((l: any) => l?.team?.id === teamId)
    if (!found) return null
    return {
      formation: found.formation ?? null,
      coach: found.coach?.name ?? null,
      starters: (found.startXI ?? []).map((p: any) => ({ name: p?.player?.name ?? '', number: p?.player?.number ?? null, pos: p?.player?.pos ?? null })),
      substitutes: (found.substitutes ?? []).map((p: any) => ({ name: p?.player?.name ?? '', number: p?.player?.number ?? null, pos: p?.player?.pos ?? null })),
    }
  }

  const homeLineup = lineup('home')
  const awayLineup = lineup('away')

  return {
    id: item.fixture.id as number,
    utcDate: item.fixture.date as string,
    status: normalizeStatus(item.fixture?.status?.short),
    statusLong: item.fixture?.status?.long ?? '',
    minute: item.fixture?.status?.elapsed ?? null,
    league: item?.league?.name ?? '',
    round: item?.league?.round ?? null,
    venue: item?.fixture?.venue?.name ? { name: item.fixture.venue.name as string, city: (item.fixture.venue.city as string) ?? null } : null,
    home: { name: item?.teams?.home?.name ?? 'Mandante', crest: item?.teams?.home?.logo ?? null },
    away: { name: item?.teams?.away?.name ?? 'Visitante', crest: item?.teams?.away?.logo ?? null },
    score: {
      home: item?.goals?.home ?? null,
      away: item?.goals?.away ?? null,
      penalty: item?.score?.penalty?.home != null ? { home: item.score.penalty.home, away: item.score.penalty.away } : null,
    },
    events: eventList(item?.events, homeId),
    lineups: homeLineup || awayLineup ? { home: homeLineup, away: awayLineup } : null,
    stats: Object.keys(stats.home).length || Object.keys(stats.away).length ? stats : null,
  }
}
