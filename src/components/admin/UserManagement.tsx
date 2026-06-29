'use client';

import { formatBoliviaDateShort } from '@/lib/datetime';
import type { UserRole } from '@/types/database';
import { Loader2, Plus, Shield, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  last_sign_in: string | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  worker: 'Operador',
};

export function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('worker');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar usuarios');
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear usuario');

      setEmail('');
      setPassword('');
      setFullName('');
      setRole('worker');
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setError('');
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al actualizar rol');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`¿Eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setError('');
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar usuario');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Gestión de usuarios
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Crea operadores y administradores para el sistema
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6"
        >
          <h3 className="font-semibold text-slate-900 mb-4">Crear nuevo usuario</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre completo *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Juan Pérez"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@parqueo.com"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Rol *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="worker">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors touch-manipulation"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear usuario
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No hay usuarios registrados</p>
        ) : (
          <>
            {/* Móvil: tarjetas */}
            <div className="md:hidden space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-slate-200 p-4 bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{user.full_name}</p>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(user.id, user.full_name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 touch-manipulation"
                        aria-label="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {user.id === currentUserId ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <Shield className="w-3 h-3" />
                        {ROLE_LABELS[user.role]} (tú)
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as UserRole)
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="worker">Operador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400 block">Creado</span>
                      {formatBoliviaDateShort(user.created_at)}
                    </div>
                    <div>
                      <span className="text-slate-400 block">Último acceso</span>
                      {user.last_sign_in
                        ? formatBoliviaDateShort(user.last_sign_in)
                        : 'Nunca'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Escritorio: tabla */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Rol</th>
                  <th className="pb-3 font-medium">Creado</th>
                  <th className="pb-3 font-medium">Último acceso</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 font-medium">{user.full_name}</td>
                    <td className="py-3 text-slate-600">{user.email}</td>
                    <td className="py-3">
                      {user.id === currentUserId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <Shield className="w-3 h-3" />
                          {ROLE_LABELS[user.role]} (tú)
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as UserRole)
                          }
                          className="px-2 py-1 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="worker">Operador</option>
                          <option value="admin">Administrador</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 text-slate-500">
                      {formatBoliviaDateShort(user.created_at)}
                    </td>
                    <td className="py-3 text-slate-500">
                      {user.last_sign_in
                        ? formatBoliviaDateShort(user.last_sign_in)
                        : 'Nunca'}
                    </td>
                    <td className="py-3">
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(user.id, user.full_name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
