// Cliente server-side da API-Sports (API-Football v3) pensado para o plano grátis (100 req/dia).
//
// - Cache em memória + "single-flight": várias pessoas pedindo ao mesmo tempo = 1 chamada.
// - A API-Sports responde HTTP 200 mesmo quando o limite estoura; o erro vem no corpo (`errors`).
//   Aqui isso é detectado e vira um "cooldown": paramos de chamar a API por um tempo.
// - Se a API falhar, devolve o último dado bom (stale) em vez de erro.
// - Lê o header de cota restante para o resto do código poder economizar.

const API_BASE = 'https://v3.football.api-sports.io'

const MAX_CACHE_ENTRIES = 300

type CacheEntry = { data: unknown; fetchedAt: number }
export type FailureReason = 'rate_limited' | 'quota' | 'unauthorized' | 'plan' | 'not_found' | 'unavailable'

export type UpstreamResult =
  | { ok: true; data: unknown; fetchedAt: number; stale: boolean }
  | { ok: false; reason: FailureReason; status: number; retryAfterSeconds?: number }

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<UpstreamResult>>()
let blockedUntil = 0 // limite diário/por minuto vale para a conta inteira: bloqueio global
let blockedReason: FailureReason = 'rate_limited'
let errorUntil = 0
export let quotaRemaining: number | null = null // requisições restantes hoje (header da API)

function remember(key: string, entry: CacheEntry) {
  cache.delete(key)
  cache.set(key, entry)
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

function fallback(key: string, failure: Extract<UpstreamResult, { ok: false }>): UpstreamResult {
  const last = cache.get(key)
  return last ? { ok: true, data: last.data, fetchedAt: last.fetchedAt, stale: true } : failure
}

function block(reason: FailureReason, seconds: number) {
  blockedReason = reason
  blockedUntil = Date.now() + seconds * 1000
}

// `errors` vem como [] quando está tudo bem e como objeto { chave: "mensagem" } quando há erro.
function readErrors(body: any): Record<string, string> {
  const errors = body?.errors
  if (!errors || Array.isArray(errors)) return {}
  return errors
}

async function request(key: string, path: string, token: string): Promise<UpstreamResult> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'x-apisports-key': token, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })

    const remaining = response.headers.get('x-ratelimit-requests-remaining')
    if (remaining !== null && remaining !== '' && !Number.isNaN(Number(remaining))) quotaRemaining = Number(remaining)

    if (response.status === 429) {
      console.error('[api-sports] HTTP 429', path)
      block('rate_limited', 300)
      return fallback(key, { ok: false, reason: 'rate_limited', status: 429, retryAfterSeconds: 300 })
    }

    const body: any = await response.json().catch(() => null)

    if (!response.ok || !body) {
      console.error('[api-sports] HTTP', response.status, path)
      errorUntil = Date.now() + 30_000
      return fallback(key, { ok: false, reason: 'unavailable', status: 503 })
    }

    const errors = readErrors(body)
    if (Object.keys(errors).length > 0) {
      console.error('[api-sports] errors', path, JSON.stringify(errors).slice(0, 300))

      if (errors.requests) { // limite DIÁRIO
        block('quota', 30 * 60)
        quotaRemaining = 0
        return fallback(key, { ok: false, reason: 'quota', status: 429, retryAfterSeconds: 30 * 60 })
      }
      if (errors.rateLimit) { // limite POR MINUTO
        block('rate_limited', 70)
        return fallback(key, { ok: false, reason: 'rate_limited', status: 429, retryAfterSeconds: 70 })
      }
      if (errors.token || errors.access || errors.bearer) return { ok: false, reason: 'unauthorized', status: 401 }
      if (errors.plan) return fallback(key, { ok: false, reason: 'plan', status: 403 })

      errorUntil = Date.now() + 30_000
      return fallback(key, { ok: false, reason: 'unavailable', status: 503 })
    }

    const entry = { data: body.response ?? [], fetchedAt: Date.now() }
    remember(key, entry)
    return { ok: true, data: entry.data, fetchedAt: entry.fetchedAt, stale: false }
  } catch (error) {
    console.error('[api-sports] fetch falhou', path, error)
    errorUntil = Date.now() + 30_000
    return fallback(key, { ok: false, reason: 'unavailable', status: 503 })
  }
}

/**
 * Busca `path` (ex.: `/fixtures?date=2026-11-04`) respeitando cache e limites.
 * @param ttl segundos em que o dado em cache é considerado fresco; pode ser uma função do dado em cache
 *            (permite TTL adaptativo: curto com jogo ao vivo, longo sem jogo).
 */
export async function apiSports(path: string, ttl: number | ((data: unknown) => number)): Promise<UpstreamResult> {
  const token = process.env.API_SPORTS_KEY || process.env.API_KEY
  if (!token) return { ok: false, reason: 'unauthorized', status: 500 }

  const key = path
  const now = Date.now()
  const cached = cache.get(key)
  if (cached) {
    const seconds = typeof ttl === 'function' ? ttl(cached.data) : ttl
    if (now - cached.fetchedAt < seconds * 1000) {
      return { ok: true, data: cached.data, fetchedAt: cached.fetchedAt, stale: false }
    }
  }

  if (now < blockedUntil) {
    const status = blockedReason === 'quota' || blockedReason === 'rate_limited' ? 429 : 503
    return fallback(key, { ok: false, reason: blockedReason, status, retryAfterSeconds: Math.ceil((blockedUntil - now) / 1000) })
  }
  if (now < errorUntil) return fallback(key, { ok: false, reason: 'unavailable', status: 503 })

  let pending = inflight.get(key)
  if (!pending) {
    pending = request(key, path, token).finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }
  return pending
}

export function failureMessage(reason: FailureReason) {
  switch (reason) {
    case 'quota':
      return 'O limite diário de consultas da API foi atingido. Os jogos voltam a atualizar automaticamente quando o limite renovar.'
    case 'rate_limited':
      return 'Muitas consultas em pouco tempo. Tentaremos novamente em instantes.'
    case 'unauthorized':
      return 'A chave da API-Sports está ausente ou inválida (variável API_SPORTS_KEY).'
    case 'plan':
      return 'O plano da API-Sports não dá acesso a estes dados (ex.: temporada ou data fora do plano).'
    case 'not_found':
      return 'Partida não encontrada.'
    default:
      return 'A fonte de dados está indisponível no momento. Tentaremos novamente em instantes.'
  }
}
