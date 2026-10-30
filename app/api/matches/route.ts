import { NextResponse } from 'next/server'

const API_BASE = 'https://v3.football.api-sports.io'

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function normalizeStatus(status: string) {
  if (['1H', '2H', 'ET', 'P', 'LIVE'].includes(status)) return 'LIVE'
  if (['HT'].includes(status)) return 'HT'
  if (['FT', 'AET', 'PEN'].includes(status)) return 'FINISHED'
  if (['CANC', 'ABD', 'AWD', 'WO'].includes(status)) return 'CANCELLED'
  return 'TIMED'
}

function normalizeMatch(item: any) {
  const fixture = item.fixture
  const events = (item.events ?? []).map((event: any) => ({
    type: event.type === 'Card' ? 'card' : event.type === 'subst' ? 'substitution' : event.type === 'Goal' ? 'goal' : 'event',
    minute: event.time?.elapsed,
    extra: event.time?.extra,
    team: event.team?.name,
    player: event.player?.name,
    assist: event.assist?.name,
    detail: event.detail,
  }))
  return {
    id: fixture.id,
    utcDate: fixture.date,
    status: normalizeStatus(fixture.status?.short),
    statusShort: fixture.status?.short,
    elapsed: fixture.status?.elapsed,
    home: { name: item.teams?.home?.name, crest: item.teams?.home?.logo ?? null },
    away: { name: item.teams?.away?.name, crest: item.teams?.away?.logo ?? null },
    score: { fullTime: { home: item.goals?.home, away: item.goals?.away } },
    league: item.league?.name ?? 'Competição não informada',
    venue: fixture.venue?.name ?? null,
    events,
  }
}

export async function GET(request: Request) {
  const token = process.env.API_KEY
  if (!token) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 })

  const fresh = new URL(request.url).searchParams.get('fresh') === '1'
  const today = new Date()
  const query = new URLSearchParams({ date: dateOnly(today), timezone: 'America/Sao_Paulo', events: 'true' })
  const response = await fetch(`${API_BASE}/fixtures?${query}`, fresh
    ? { headers: { 'x-apisports-key': token }, cache: 'no-store' }
    : { headers: { 'x-apisports-key': token }, next: { revalidate: 300 } })

  if (!response.ok) return NextResponse.json({ error: 'A fonte de dados recusou a consulta.' }, { status: response.status })
  const payload = await response.json()
  return NextResponse.json({ matches: (payload.response ?? []).map(normalizeMatch), updatedAt: new Date().toISOString() })
}
