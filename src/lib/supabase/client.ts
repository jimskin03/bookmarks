import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://vlnocfdiexkqcnfbjhqt.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ys0Cl98LLqAdNEiNY1f7Mg_lddIzr6F'
const ROOT_DOMAIN = 'cryptgregresearch.org'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY

function sharedCookieDomain(): string {
  if (typeof window === 'undefined') return ''
  const hostname = window.location.hostname
  return hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)
    ? `; Domain=${ROOT_DOMAIN}`
    : ''
}

// Supabase auth storage is shared at the root domain in production (*.cryptgregresearch.org).
// The localStorage mirror preserves authentication across local dev environments.
const sharedCookieStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    const cookie = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${key}=`))
    if (cookie) return decodeURIComponent(cookie.slice(key.length + 1))
    const legacy = localStorage.getItem(key)
    if (legacy) this.setItem(key, legacy)
    return legacy
  },
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    const domain = sharedCookieDomain()
    document.cookie = `${key}=; Max-Age=0; Path=/; Secure; SameSite=Lax`
    document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/${domain}; Secure; SameSite=Lax`
    localStorage.setItem(key, value)
  },
  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    const domain = sharedCookieDomain()
    document.cookie = `${key}=; Max-Age=0; Path=/; Secure; SameSite=Lax`
    document.cookie = `${key}=; Max-Age=0; Path=/${domain}; Secure; SameSite=Lax`
    localStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: sharedCookieStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Schema-specific client for Bookmarks
export const bookmarksDb = supabase.schema('bookmarks')
