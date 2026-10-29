import { NextResponse } from 'next/server'

const API_BASE = 'https://api.football-data.org/v4'

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function GET() {
  const token = process.env.API_KEY
  if (!token) {
    return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 })
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(today.getUTCDate() + 1)

  const response = await fetch(`${API_BASE}/matches?dateFrom=${dateOnly(today)}&dateTo=${dateOnly(tomorrow)}`, {
    headers: { 'X-Auth-Token': token },
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'A fonte de dados recusou a consulta.' }, { status: response.status })
  }

  const payload = await response.json()
  const matches = (payload.matches ?? []).map((match: any) => ({
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    home: { name: match.homeTeam.name, crest: match.homeTeam.crest ?? null },
    away: { name: match.awayTeam.name, crest: match.awayTeam.crest ?? null },
    score: match.score,
    league: match.competition.name,
    events: [
      ...(match.goals ?? []).map((goal: any) => ({ type: 'goal', minute: goal.minute, team: goal.team?.name, player: goal.scorer?.name ?? 'Jogador' })),
      ...(match.bookings ?? []).map((booking: any) => ({ type: 'card', minute: booking.minute, team: booking.team?.name, player: booking.player?.name ?? 'Jogador' })),
    ].sort((a: any, b: any) => (a.minute ?? 0) - (b.minute ?? 0)),
  }))

  return NextResponse.json({ matches, updatedAt: new Date().toISOString() })
}
