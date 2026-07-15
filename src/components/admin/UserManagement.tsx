'use client';

import { formatBoliviaDateShort } from '@/lib/datetime';
import type { UserRole } from '@/types/database';
import {
  Loader2,
  Lock,
  Mail,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  last_sign_in: string | null;
  is_locked: boolean;
  failed_login_attempts: number;
  locked_at: string | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  worker: 'Operador',
};

interface UserFormModalProps {
  mode: 'create' | 'edit';
  user?: UserItem;
  currentUserId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

function UserFormModal({
  mode,
  user,
  currentUserId,
  onClose,
  onSaved,
  onError,
}: UserFormModalProps) {
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'worker');
  const [submitting, setSubmitting] = useState(false);

  const isSelf = user?.id === currentUserId;
  const isEdit = mode === 'edit';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEdit && user) {
        const body: Record<string, string> = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
        };
        if (!isSelf) body.role = role;
        if (password.trim()) body.password = password;

        const res = await fetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error al actualizar usuario');
        onSaved('Usuario actualizado correctamente');
      } else {
        if (!password.trim()) {
          throw new Error('La contraseña es obligatoria al crear un usuario');
        }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            full_name: fullName.trim(),
            role,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error al crear usuario');
        onSaved('Usuario creado correctamente');
      }
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
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
              {isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={isEdit ? undefined : 6}
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isSelf}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="worker">Operador</option>
              <option value="admin">Administrador</option>
            </select>
            {isSelf && (
              <p className="text-xs text-slate-500 mt-1">
                No puedes cambiar tu propio rol de administrador.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                <Pencil className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: UserItem } | null>(null);

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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q)
    );
  }, [users, search]);

  async function handleUnlock(userId: string) {
    setError('');
    setSuccess('');
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/unlock`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al desbloquear');
      setSuccess('Usuario desbloqueado correctamente');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desbloquear');
    } finally {
      setActionUserId(null);
    }
  }

  async function handleResetPassword(userId: string, userEmail: string) {
    if (
      !confirm(
        `¿Enviar correo de recuperación de contraseña a ${userEmail}? También se desbloqueará la cuenta.`
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar correo');
      setSuccess(data.message ?? 'Correo de recuperación enviado');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar correo');
    } finally {
      setActionUserId(null);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`¿Eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar usuario');
      setSuccess('Usuario eliminado correctamente');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  }

  function UserStatus({ user }: { user: UserItem }) {
    if (user.is_locked) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <Lock className="w-3 h-3" />
          Bloqueado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Activo
      </span>
    );
  }

  function UserActions({ user }: { user: UserItem }) {
    const busy = actionUserId === user.id;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setModal({ mode: 'edit', user })}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>

        {user.is_locked && user.id !== currentUserId && (
          <button
            onClick={() => handleUnlock(user.id)}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
            Desbloquear
          </button>
        )}

        {user.id !== currentUserId && (
          <>
            <button
              onClick={() => handleResetPassword(user.id, user.email)}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
              Recuperar
            </button>
            <button
              onClick={() => handleDelete(user.id, user.full_name)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Eliminar
            </button>
          </>
        )}
      </div>
    );
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
            Crear, editar y eliminar operadores y administradores
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o rol..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center py-12 text-slate-400">
            {search ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-4">
              {filteredUsers.length} usuario(s)
            </p>

            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-slate-200 p-4 bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{user.full_name}</p>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                    {user.id === currentUserId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 shrink-0">
                        <Shield className="w-3 h-3" />
                        Tú
                      </span>
                    ) : (
                      <UserStatus user={user} />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>

                  <div className="mb-3">
                    <UserActions user={user} />
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

            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Rol</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium">Creado</th>
                    <th className="pb-3 font-medium">Último acceso</th>
                    <th className="pb-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {user.full_name}
                          {user.id === currentUserId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              tú
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{user.email}</td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="py-3">
                        <UserStatus user={user} />
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
                        <UserActions user={user} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modal && (
        <UserFormModal
          mode={modal.mode}
          user={modal.user}
          currentUserId={currentUserId}
          onClose={() => setModal(null)}
          onSaved={(message) => {
            setSuccess(message);
            setError('');
            loadUsers();
          }}
          onError={(message) => {
            setError(message);
            setSuccess('');
          }}
        />
      )}
    </div>
  );
}
