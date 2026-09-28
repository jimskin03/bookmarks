import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { vaultStorage } from '@/lib/storage/vaultStorage'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cryptgreg_demo_mode') === 'true'
    }
    return false
  })

  useEffect(() => {
    let active = true

    // Check existing Supabase session
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session?.user || null)
      setError(sessionError?.message || null)
      setIsLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setUser(nextSession?.user || null)
      if (nextSession) {
        setIsDemoMode(false)
        localStorage.removeItem('cryptgreg_demo_mode')
        vaultStorage.setDemoMode(false)
      }
      setIsLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      throw signInError
    }
    setIsDemoMode(false)
    localStorage.removeItem('cryptgreg_demo_mode')
    vaultStorage.setDemoMode(false)
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setIsDemoMode(false)
    localStorage.removeItem('cryptgreg_demo_mode')
  }, [])

  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true)
    localStorage.setItem('cryptgreg_demo_mode', 'true')
    vaultStorage.setDemoMode(true)
    setIsLoading(false)
  }, [])

  return {
    session,
    user,
    isLoading,
    error,
    isDemoMode,
    isAuthenticated: !!session || isDemoMode,
    signIn,
    signOut,
    enterDemoMode,
  }
}
