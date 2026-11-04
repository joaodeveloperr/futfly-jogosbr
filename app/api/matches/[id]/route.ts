import { NextResponse } from 'next/server'
import { apiSports, failureMessage } from '@/lib/api-sports'
import { isLive, normalizeDetail, normalizeStatus } from '@/lib/football'

export const dynamic = 'force-dynamic'

// Cada detalhe custa 1 requisição do plano diário (a API devolve eventos, escalações e estatísticas juntos).
function ttlFor(data: unknown): number {
  const status = normalizeStatus((Array.isArray(data) ? data[0] : undefined)?.fixture?.status?.short)
  if (status === 'FINISHED' || status === 'CANCELLED') return 6 * 3600
  if (isLive(status)) return 180
  return 1800
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // O id entra direto na URL da API externa: só aceita números.
  if (!/^\d{1,10}$/.test(id)) {
    return NextResponse.json({ error: 'Partida não encontrada.' }, { status: 404 })
  }

  const result = await apiSports(`/fixtures?id=${id}&timezone=America%2FSao_Paulo`, ttlFor)

  if (result.ok) {
    const item = Array.isArray(result.data) ? result.data[0] : null
    if (!item?.fixture?.id) return NextResponse.json({ error: failureMessage('not_found'), code: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'public, s-maxage=300' } })

    const ttl = ttlFor(result.data)
    return NextResponse.json(
      { match: normalizeDetail(item), stale: result.stale },
      { headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl}` } },
    )
  }

  const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
  if (result.retryAfterSeconds) headers['Retry-After'] = String(result.retryAfterSeconds)
  return NextResponse.json({ error: failureMessage(result.reason), code: result.reason }, { status: result.status, headers })
}
