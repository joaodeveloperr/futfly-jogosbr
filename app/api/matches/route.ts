import { NextResponse } from 'next/server'

const API_BASE = 'https://api.api-futebol.com.br/v1'

function normalizeStatus(status: string) {
  if (status === 'andamento') return 'IN_PLAY'
  if (status === 'finalizado') return 'FINISHED'
  if (status === 'agendado' || status === 'pre-jogo') return 'TIMED'
  if (status === 'adiado') return 'POSTPONED'
  if (status === 'suspensa') return 'SUSPENDED'
  return 'TIMED'
}

function normalizeMatch(item: any) {
  const events = [
    ...(item.gols?.mandante ?? []).map((gol: any) => ({
      type: 'goal',
      minute: gol.minuto ? parseInt(gol.minuto.split(':')[0]) : null,
      team: item.time_mandante.nome_popular,
      player: gol.atleta.nome_popular,
    })),
    ...(item.gols?.visitante ?? []).map((gol: any) => ({
      type: 'goal',
      minute: gol.minuto ? parseInt(gol.minuto.split(':')[0]) : null,
      team: item.time_visitante.nome_popular,
      player: gol.atleta.nome_popular,
    })),
  ]

  return {
    id: item.partida_id,
    utcDate: item.data_realizacao_iso,
    status: normalizeStatus(item.status),
    home: { name: item.time_mandante.nome_popular, crest: item.time_mandante.escudo },
    away: { name: item.time_visitante.nome_popular, crest: item.time_visitante.escudo },
    score: {
      fullTime: {
        home: item.placar_mandante,
        away: item.placar_visitante
      }
    },
    league: item.campeonato.nome,
    venue: item.estadio?.nome_popular ?? null,
    events,
  }
}

export async function GET(request: Request) {
  const token = process.env.API_KEY
  if (!token) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 })

  try {
    const response = await fetch(`${API_BASE}/ao-vivo`, {
      headers: { 'Authorization': `Bearer ${token}` },
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      console.error('API error:', response.status, await response.text())
      return NextResponse.json({ error: 'A fonte de dados recusou a consulta.' }, { status: response.status })
    }

    const aoVivo = await response.json()
    const matches = Array.isArray(aoVivo) ? aoVivo.map(normalizeMatch) : []

    return NextResponse.json(
      { matches, updatedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados.' }, { status: 500 })
  }
}
