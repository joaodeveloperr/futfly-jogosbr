import { NextResponse } from 'next/server'

const API_BASE = 'https://api.api-futebol.com.br/v1'

export async function GET(request: Request) {
  const token = process.env.API_KEY
  if (!token) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const pagina = searchParams.get('pagina') || '1'
  const por_pagina = searchParams.get('por_pagina') || '10'

  try {
    const query = new URLSearchParams({ pagina, por_pagina })
    const response = await fetch(`${API_BASE}/noticias?${query}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      console.error('API error:', response.status)
      return NextResponse.json({ error: 'Erro ao buscar notícias.' }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: 'Erro ao buscar notícias.' }, { status: 500 })
  }
}
