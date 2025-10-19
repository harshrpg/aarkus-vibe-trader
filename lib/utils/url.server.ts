import { headers } from 'next/headers'

/**
 * Server-only helpers for resolving the application base URL using request headers.
 */
export async function getBaseUrlFromHeaders(): Promise<URL> {
    const headersList = await headers()
    const baseUrl = headersList.get('x-base-url')
    const url = headersList.get('x-url')
    const host = headersList.get('x-host')
    const protocol = headersList.get('x-protocol') || 'http:'

    try {
        if (baseUrl) {
            return new URL(baseUrl)
        } else if (url) {
            return new URL(url)
        } else if (host) {
            const constructedUrl = `${protocol}${protocol.endsWith(':') ? '//' : '://'}${host}`
            return new URL(constructedUrl)
        } else {
            return new URL('http://localhost:3000')
        }
    } catch {
        return new URL('http://localhost:3000')
    }
}

export async function getBaseUrl(): Promise<URL> {
    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL
    if (baseUrlEnv) {
        try {
            return new URL(baseUrlEnv)
        } catch {
            // fall through to headers-based resolution
        }
    }
    return await getBaseUrlFromHeaders()
}

export async function getBaseUrlString(): Promise<string> {
    const baseUrlObj = await getBaseUrl()
    return baseUrlObj.toString()
}


