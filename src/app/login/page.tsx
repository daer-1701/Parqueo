'use client';

import { getDashboardPath } from '@/lib/auth';
import { markAppSessionActive } from '@/lib/session-gate';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Car, KeyRound, Loader2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const lockedParam = searchParams.get('locked');
  const resetParam = searchParams.get('reset');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'No se pudo iniciar sesión');
        setLoading(false);
        return;
      }

      const destination = data.destination ?? getDashboardPath(data.role);
      markAppSessionActive();
      router.push(destination);
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 mb-4">
          <Car className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">ParqueoSys</h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">Sistema de gestión de parqueo</p>
      </div>

      <form
        onSubmit={handleLogin}
        className="bg-white/10 rounded-2xl p-5 sm:p-8 border border-white/20 shadow-xl"
      >
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-5 sm:mb-6">Iniciar sesión</h2>

        {resetParam === 'ok' && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
            Contraseña actualizada. Ya puedes iniciar sesión.
          </div>
        )}

        {(lockedParam === '1' || error) && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            {error ||
              'Cuenta bloqueada por intentos fallidos. Usa Recuperar contraseña o contacta al administrador.'}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
              placeholder="usuario@parqueo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 sm:py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Máximo 3 intentos fallidos. Si se bloquea tu cuenta, usa Recuperar contraseña.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3 sm:py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation text-base sm:text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Entrar
        </button>

        <Link
          href="/auth/forgot-password"
          className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 text-sm text-slate-300 hover:text-white transition-colors touch-manipulation"
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          Recuperar contraseña
        </Link>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-8 safe-top pb-safe">
      <Suspense
        fallback={
          <div className="text-white flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
