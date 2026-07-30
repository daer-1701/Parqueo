'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** dark = login; light = formularios admin */
  tone?: 'dark' | 'light';
};

export function PasswordInput({
  className = '',
  tone = 'light',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const toggleClass =
    tone === 'dark'
      ? 'text-slate-400 hover:text-white hover:bg-white/10'
      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100';

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-11`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors touch-manipulation ${toggleClass}`}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
