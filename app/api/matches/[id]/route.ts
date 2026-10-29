import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = process.env.API_KEY
  const { id } = await params
  if (!token) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 })
  const response = await fetch(`https://api.football-data.org/v4/matches/${encodeURIComponent(id)}`, { headers: { 'X-Auth-Token': token }, next: { revalidate: 15 } })
  if (!response.ok) return NextResponse.json({ error: 'Partida não encontrada na fonte oficial.' }, { status: response.status })
  const match = await response.json()
  return NextResponse.json({ match: { id: match.id, utcDate: match.utcDate, status: match.status, home: { name: match.homeTeam.name, crest: match.homeTeam.crest ?? null }, away: { name: match.awayTeam.name, crest: match.awayTeam.crest ?? null }, score: match.score, league: match.competition?.name ?? 'Competição não informada', venue: match.venue, referees: (match.referees ?? []).map((referee: { name?: string }) => referee.name).filter(Boolean), events: [...(match.goals ?? []).map((goal: { minute?: number; team?: { name?: string }; scorer?: { name?: string } }) => ({ type: 'goal', minute: goal.minute, team: goal.team?.name, player: goal.scorer?.name ?? 'Jogador não informado' })), ...(match.bookings ?? []).map((booking: { minute?: number; team?: { name?: string }; player?: { name?: string } }) => ({ type: 'card', minute: booking.minute, team: booking.team?.name, player: booking.player?.name ?? 'Jogador não informado' }))].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0)) } })
}
