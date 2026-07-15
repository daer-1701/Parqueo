'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowLeft, Car, Loader2, Mail } from 'lucide-react';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const linkError = searchParams.get('error') === 'link';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar el correo');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
          <Car className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Te enviaremos un enlace seguro a tu correo
        </p>
      </div>

      <div className="bg-white/10 rounded-2xl p-5 sm:p-8 border border-white/20 shadow-xl">
        {linkError && !sent && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 text-sm">
            El enlace expiró o ya fue usado. Solicita uno nuevo.
          </div>
        )}

        {sent ? (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-300">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Revisa tu correo</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Si <strong className="text-white">{email}</strong> está registrado, recibirás un
                enlace para crear una nueva contraseña. El enlace vence en aproximadamente 1 hora.
              </p>
            </div>
            <ul className="text-left text-xs text-slate-400 space-y-1.5 bg-white/5 rounded-lg p-4">
              <li>• Revisa la carpeta de spam o promociones</li>
              <li>• Abre el enlace en este mismo dispositivo</li>
              <li>• Si no llega, espera unos minutos e intenta de nuevo</li>
            </ul>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usuario@parqueo.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar enlace de recuperación
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full mt-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
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
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
