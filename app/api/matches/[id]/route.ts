import { NextResponse } from 'next/server'

const API_BASE = 'https://api.api-futebol.com.br/v1'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = process.env.API_KEY
  const { id } = await params
  if (!token) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 })

  try {
    const response = await fetch(`${API_BASE}/partidas/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      console.error('API error:', response.status)
      return NextResponse.json({ error: 'Partida não encontrada.' }, { status: response.status })
    }

    const partida = await response.json()

    return NextResponse.json(
      { match: partida },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    )
  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: 'Erro ao buscar partida.' }, { status: 500 })
  }
}
