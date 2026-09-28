import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react'

interface AuthGateProps {
  isLoading: boolean
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onEnterDemo: () => void
}

export const AuthGate: React.FC<AuthGateProps> = ({
  isLoading,
  error,
  onSignIn,
  onEnterDemo,
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsSubmitting(true)
    try {
      await onSignIn(email.trim(), password)
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#121214] text-zinc-400 select-none">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs">Connecting to CryptGreg Vault...</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#101012] p-4 select-none">
      <div className="w-full max-w-sm bg-[#16161a] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-2.5 rounded-xl bg-purple-950/80 border border-purple-800/50 text-purple-400 mb-1">
            <Sparkles size={24} />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Bookmarks</h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Cloud-based personal knowledge vault for CryptGreg users. Markdown notes, [[links]], graph, & mind map.
          </p>
        </div>

        {/* Demo Vault quick access */}
        <div className="bg-purple-950/30 border border-purple-900/50 rounded-xl p-3 text-center space-y-2">
          <p className="text-[11px] text-purple-300">
            Want to try Bookmarks immediately without signing in?
          </p>
          <button
            type="button"
            onClick={onEnterDemo}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Launch Instant Demo Vault</span>
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-800 w-full"></div>
          <span className="bg-[#16161a] px-3 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            or sign in with CryptGreg
          </span>
        </div>

        {/* Supabase CryptGreg Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400 block">Email</label>
            <div className="relative flex items-center">
              <Mail size={14} className="absolute left-3 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cryptgregresearch.org"
                className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400 block">Password</label>
            <div className="relative flex items-center">
              <Lock size={14} className="absolute left-3 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-lg pl-9 pr-9 py-2 text-xs text-zinc-200 outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {(localError || error) && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-lg transition-colors border border-zinc-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in to CryptGreg'}
          </button>
        </form>

        <p className="text-[10px] text-zinc-500 text-center leading-normal">
          Shared identity with cryptgregresearch.org. Data remains strictly isolated in the <code>bookmarks</code> schema.
        </p>
      </div>
    </div>
  )
}
