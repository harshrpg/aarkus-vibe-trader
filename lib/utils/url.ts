// Client-safe utilities. Server-only versions live in `url.server.ts`.

export async function getBaseUrlFromHeaders(): Promise<URL> {
  // In the browser we cannot access request headers. Use window.location when available.
  if (typeof window !== 'undefined' && window.location) {
    return new URL(window.location.origin)
  }
  // Fallback default when executed in non-request server contexts
  return new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
}

export async function getBaseUrl(): Promise<URL> {
  const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL
  if (baseUrlEnv) {
    try {
      return new URL(baseUrlEnv)
    } catch {
      // ignore and fall back
    }
  }
  return await getBaseUrlFromHeaders()
}

export async function getBaseUrlString(): Promise<string> {
  const baseUrlObj = await getBaseUrl()
  return baseUrlObj.toString()
}