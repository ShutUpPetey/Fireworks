import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, User, Shield } from 'lucide-react';
import { db, ref, get, set, remove, onValue, emailToKey } from '../firebase';
import type { AuthUser } from './AuthGate';

interface Props {
  currentUser: AuthUser;
  onClose: () => void;
}

interface UserEntry {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  joinedAt: number;
}

interface InvitedEmail {
  email: string;
  invitedBy: string;
  invitedAt: number;
}

export default function AdminPanel({ currentUser, onClose }: Props) {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [invites, setInvites] = useState<InvitedEmail[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!db) return;
    const u1 = onValue(ref(db, 'allowed_users'), snap => {
      setUsers(snap.exists() ? Object.values(snap.val()) : []);
    });
    const u2 = onValue(ref(db, 'invited_emails'), snap => {
      setInvites(snap.exists() ? Object.values(snap.val()) : []);
    });
    return () => { u1(); u2(); };
  }, []);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !db) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await set(ref(db, `invited_emails/${emailToKey(email)}`), {
        email,
        invitedBy: currentUser.uid,
        invitedAt: Date.now(),
      });
      setInviteEmail('');
      setMsg(`${email} added. Tell them to open the app and sign in with Google.`);
    } catch {
      setMsg('Failed to add user.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveUser = async (user: UserEntry) => {
    if (!db) return;
    if (user.uid === currentUser.uid) { setMsg("You can't remove yourself."); return; }
    if (!confirm(`Remove access for ${user.email}?`)) return;
    try {
      await remove(ref(db, `allowed_users/${user.uid}`));
      await remove(ref(db, `invited_emails/${emailToKey(user.email)}`));
    } catch {
      setMsg('Failed to remove user.');
    }
  };

  const handleRevokeInvite = async (invite: InvitedEmail) => {
    if (!db) return;
    if (!confirm(`Revoke invite for ${invite.email}?`)) return;
    try {
      await remove(ref(db, `invited_emails/${emailToKey(invite.email)}`));
    } catch {
      setMsg('Failed to revoke invite.');
    }
  };

  const handleToggleRole = async (user: UserEntry) => {
    if (!db) return;
    if (user.uid === currentUser.uid) { setMsg("You can't change your own role."); return; }
    const newRole: 'admin' | 'member' = user.role === 'admin' ? 'member' : 'admin';
    try {
      await set(ref(db, `allowed_users/${user.uid}/role`), newRole);
    } catch {
      setMsg('Failed to update role.');
    }
  };

  const activeEmails = new Set(users.map(u => u.email.toLowerCase()));
  const pendingInvites = invites.filter(i => !activeEmails.has(i.email.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-blue-400" />
            <span className="font-semibold text-white text-sm">Manage Access</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">

          {/* Invite form */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Add someone</p>
            <div className="flex gap-2">
              <input
                type="email"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="their-email@gmail.com"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setMsg(''); }}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <button
                onClick={handleInvite}
                disabled={busy || !inviteEmail.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
              >
                <UserPlus size={14} /> Add
              </button>
            </div>
            {msg && (
              <p className="mt-2 text-xs text-slate-300 leading-snug">{msg}</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              They sign in at the app URL using their Google account — no email sent from here.
            </p>
          </div>

          {/* Active users */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Active users ({users.length})
            </p>
            <div className="space-y-1.5">
              {users.length === 0 && <p className="text-xs text-slate-600 italic">No users yet</p>}
              {users.sort((a, b) => a.joinedAt - b.joinedAt).map(user => (
                <div key={user.uid} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-700/50">
                  <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
                    <User size={13} className="text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate leading-tight">{user.name || user.email}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleToggleRole(user)}
                    disabled={user.uid === currentUser.uid}
                    title={user.uid === currentUser.uid ? 'Your account' : `Click to make ${user.role === 'admin' ? 'member' : 'admin'}`}
                    className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                      user.role === 'admin'
                        ? 'bg-blue-900/60 text-blue-300 hover:bg-blue-900 cursor-pointer'
                        : 'bg-slate-600/60 text-slate-300 hover:bg-slate-600 cursor-pointer'
                    } disabled:cursor-default`}
                  >
                    {user.role}
                  </button>
                  <button
                    onClick={() => handleRemoveUser(user)}
                    disabled={user.uid === currentUser.uid}
                    className="text-slate-500 hover:text-red-400 disabled:opacity-20 transition-colors"
                    title="Remove access"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                Pending — hasn't signed in yet ({pendingInvites.length})
              </p>
              <div className="space-y-1.5">
                {pendingInvites.map(invite => (
                  <div key={invite.email} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-700/25 border border-slate-700/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{invite.email}</p>
                      <p className="text-xs text-slate-500">Waiting for first sign-in</p>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(invite)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Revoke"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
