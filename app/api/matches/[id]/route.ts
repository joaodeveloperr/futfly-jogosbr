import { NextResponse } from 'next/server'

function normalizeStatus(status: string) {
  if (['1H', '2H', 'ET', 'P', 'LIVE'].includes(status)) return 'LIVE'
  if (status === 'HT') return 'HT'
  if (['FT', 'AET', 'PEN'].includes(status)) return 'FINISHED'
  if (['CANC', 'ABD', 'AWD', 'WO'].includes(status)) return 'CANCELLED'
  return 'TIMED'
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = process.env.API_KEY
  const { id } = await params
  if (!token) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 })

  const response = await fetch(`https://v3.football.api-sports.io/fixtures?id=${encodeURIComponent(id)}&events=true`, {
    headers: { 'x-apisports-key': token },
    next: { revalidate: 30 },
  })
  if (!response.ok) return NextResponse.json({ error: 'Partida não encontrada na fonte oficial.' }, { status: response.status })

  const payload = await response.json()
  const item = payload.response?.[0]
  if (!item) return NextResponse.json({ error: 'Partida não encontrada na fonte oficial.' }, { status: 404 })

  return NextResponse.json({
    match: {
      id: item.fixture.id,
      utcDate: item.fixture.date,
      status: normalizeStatus(item.fixture.status?.short),
      statusShort: item.fixture.status?.short,
      elapsed: item.fixture.status?.elapsed,
      home: { name: item.teams?.home?.name, crest: item.teams?.home?.logo ?? null },
      away: { name: item.teams?.away?.name, crest: item.teams?.away?.logo ?? null },
      score: { fullTime: { home: item.goals?.home, away: item.goals?.away } },
      league: item.league?.name ?? 'Competição não informada',
      venue: item.fixture?.venue?.name ?? null,
      referees: [],
      events: (item.events ?? []).map((event: any) => ({
        type: event.type === 'Card' ? 'card' : event.type === 'subst' ? 'substitution' : event.type === 'Goal' ? 'goal' : 'event',
        minute: event.time?.elapsed,
        extra: event.time?.extra,
        team: event.team?.name,
        player: event.player?.name,
        assist: event.assist?.name,
        detail: event.detail,
      })),
    },
  })
}
