import { NextResponse } from 'next/server'
import { apiSports, failureMessage, quotaRemaining } from '@/lib/api-sports'
import { TIMEZONE, isLive, normalizeFixture, normalizeStatus, priorityLeagues, todayInBrazil } from '@/lib/football'

export const dynamic = 'force-dynamic'

// O plano grátis da API-Sports tem 100 requisições por DIA. Por isso o intervalo é adaptativo:
// curto só quando há jogo ao vivo (ou prestes a começar) e longo no resto do dia.
const LIVE_TTL = Math.max(120, Number(process.env.LIVE_TTL_SECONDS) || 300)
const IDLE_TTL = Math.max(600, Number(process.env.IDLE_TTL_SECONDS) || 1800)
const LOW_QUOTA_TTL = 3600
const MAX_MATCHES = 250

function ttlFor(data: unknown): number {
  let ttl = IDLE_TTL
  if (Array.isArray(data)) {
    const now = Date.now()
    const active = data.some((item: any) => {
      if (normalizeStatus(item?.fixture?.status?.short) !== 'TIMED') return isLive(normalizeStatus(item?.fixture?.status?.short))
      const kickoff = Date.parse(item?.fixture?.date)
      return Number.isFinite(kickoff) && kickoff - now < 40 * 60 * 1000 && kickoff - now > -3 * 60 * 60 * 1000
    })
    if (active) ttl = LIVE_TTL
  }
  // Pouca cota restante no dia: economiza.
  if (quotaRemaining !== null && quotaRemaining < 15) ttl = Math.max(ttl, LOW_QUOTA_TTL)
  return ttl
}

export async function GET() {
  const date = todayInBrazil()
  const result = await apiSports(`/fixtures?date=${date}&timezone=${encodeURIComponent(TIMEZONE)}`, ttlFor)

  if (result.ok) {
    const priority = priorityLeagues()
    const rank = (leagueId: number | null) => { const i = priority.indexOf(leagueId as number); return i === -1 ? 999 : i }
    const matches = (Array.isArray(result.data) ? result.data : [])
      .filter((item: any) => item?.fixture?.id)
      .map(normalizeFixture)
      .sort((a, b) => Number(isLive(b.status)) - Number(isLive(a.status)) || rank(a.leagueId) - rank(b.leagueId) || a.utcDate.localeCompare(b.utcDate))
      .slice(0, MAX_MATCHES)

    const ttl = ttlFor(result.data)
    return NextResponse.json(
      { matches, date, updatedAt: new Date(result.fetchedAt).toISOString(), stale: result.stale, ttlSeconds: ttl },
      { headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl}` } },
    )
  }

  const notice = { code: result.reason, message: failureMessage(result.reason) }

  // Chave ausente/inválida é erro de configuração: não deve ficar em cache.
  if (result.reason === 'unauthorized') {
    return NextResponse.json({ matches: [], updatedAt: null, notice }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }

  // Limite estourado / API fora: responde 200 com aviso para o CDN guardar por 1 min
  // e absorver os visitantes, em vez de cada um gerar uma nova chamada.
  return NextResponse.json(
    { matches: [], updatedAt: null, notice, retryAfterSeconds: result.retryAfterSeconds ?? 60 },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
  )
}
