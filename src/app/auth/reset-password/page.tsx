'use client';

import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Car, CheckCircle2, Loader2, Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function initSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session && mounted) {
        setReady(true);
        setChecking(false);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          setReady(true);
          setChecking(false);
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();

      await new Promise((r) => setTimeout(r, 800));

      const { data: retry } = await supabase.auth.getSession();
      if (mounted && retry.session) {
        setReady(true);
      }

      if (mounted) setChecking(false);
    }

    initSession();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [supabase.auth]);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirm && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!passwordValid) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await fetch('/api/auth/complete-reset', { method: 'POST' });
    await supabase.auth.signOut();
    router.push('/login?reset=ok');
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <Car className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Crea una contraseña segura para tu cuenta
          </p>
        </div>

        {checking ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm text-slate-400">Verificando enlace…</p>
          </div>
        ) : (
          <div className="bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            {ready ? (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Enlace verificado. Ingresa tu nueva contraseña.
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Repite la contraseña"
                      />
                    </div>
                  </div>
                </div>

                {confirm.length > 0 && !passwordsMatch && (
                  <p className="mt-2 text-xs text-red-300">Las contraseñas no coinciden</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !passwordValid || !passwordsMatch}
                  className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Guardar contraseña
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-slate-300 text-sm">
                  El enlace no es válido o expiró. Solicita uno nuevo a tu correo.
                </p>
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Solicitar nuevo enlace
                </Link>
              </div>
            )}

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full mt-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
