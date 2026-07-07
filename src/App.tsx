import { useState, useRef } from 'react';
import { Flame, ListOrdered, CalendarDays, FileText, Download, FolderOpen, Map, Shield, LogOut } from 'lucide-react';
import { useStore } from './store';
import type { SyncStatus } from './store';
import { isConfigured, signOut } from './firebase';
import AuthGate from './components/AuthGate';
import type { AuthUser } from './components/AuthGate';
import AdminPanel from './components/AdminPanel';
import InventoryTab from './components/InventoryTab';
import PlannerTab from './components/PlannerTab';
import CueSheetTab from './components/CueSheetTab';
import MapTab from './components/MapTab';

type Tab = 'inventory' | 'planner' | 'cues' | 'map';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'inventory', label: 'Inventory',    icon: <ListOrdered size={16} /> },
  { id: 'planner',   label: 'Show Planner', icon: <CalendarDays size={16} /> },
  { id: 'cues',      label: 'Cue Sheet',    icon: <FileText size={16} /> },
  { id: 'map',       label: 'Map',          icon: <Map size={16} /> },
];

const SYNC_LABEL: Record<SyncStatus, string> = {
  synced:  'Synced',
  saving:  'Saving…',
  offline: 'Offline',
  local:   'Local only',
};

const SYNC_DOT: Record<SyncStatus, string> = {
  synced:  'bg-emerald-400',
  saving:  'bg-amber-400 animate-pulse',
  offline: 'bg-red-400',
  local:   'bg-slate-500',
};

function AppContent({ user }: { user: AuthUser }) {
  const [tab, setTab] = useState<Tab>('inventory');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const store = useStore();
  const loadInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const data = JSON.stringify({
      fireworks: store.fireworks,
      showItems: store.showItems,
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fireworks-show-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!confirm('Load this save file? This will replace your current show and inventory.')) return;
        store.loadAll(data);
      } catch {
        alert("Could not read file — make sure it's a valid FireworksFX save.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-orange-400 shrink-0" />
          <span className="text-base md:text-lg font-bold text-white tracking-tight">FireworksFX</span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Show Planner</span>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 ml-1 md:ml-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">

          {/* Sync status */}
          <div
            className="flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1 rounded-md bg-slate-800/60"
            title={isConfigured ? 'Firebase Realtime Database' : 'Configure Firebase in src/firebase-config.ts to enable cloud sync'}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${SYNC_DOT[store.syncStatus]}`} />
            <span className="hidden sm:inline">{SYNC_LABEL[store.syncStatus]}</span>
          </div>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          <button
            onClick={handleSave}
            title="Export show to JSON file"
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-2.5 md:px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => loadInputRef.current?.click()}
            title="Import show from JSON file"
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-2.5 md:px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <FolderOpen size={14} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <input
            ref={loadInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleLoadFile}
          />

          <div className="hidden md:flex items-center gap-4 text-xs text-slate-500 border-l border-slate-800 pl-3 ml-1">
            <span><span className="text-slate-300">{store.fireworks.length}</span> fireworks</span>
            <span><span className="text-slate-300">{store.showItems.length}</span> in show</span>
          </div>

          {/* User avatar + menu */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowUserMenu(m => !m)}
              onBlur={() => setTimeout(() => setShowUserMenu(false), 150)}
              className="w-8 h-8 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center text-xs font-bold text-white transition-colors shrink-0"
              title={user.email}
            >
              {initials}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-10 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-slate-700">
                  <p className="text-white text-sm font-medium truncate">{user.name}</p>
                  <p className="text-slate-400 text-xs truncate">{user.email}</p>
                </div>
                {user.role === 'admin' && (
                  <button
                    onMouseDown={() => { setShowAdmin(true); setShowUserMenu(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Shield size={13} className="text-blue-400" /> Manage Access
                  </button>
                )}
                <button
                  onMouseDown={() => signOut()}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'inventory' && (
          <InventoryTab
            fireworks={store.fireworks}
            showItems={store.showItems}
            onAdd={store.addFirework}
            onUpdate={store.updateFirework}
            onDelete={store.deleteFirework}
            onImport={store.importFireworks}
          />
        )}
        {tab === 'planner' && (
          <PlannerTab
            fireworks={store.fireworks}
            showItems={store.showItems}
            onAdd={store.addShowItem}
            onAddMany={store.addShowItems}
            onUpdate={store.updateShowItem}
            onUpdateFirework={store.updateFirework}
            onRemove={store.removeShowItem}
            onClear={store.clearShow}
            onAddSimultaneous={store.addSimultaneous}
            onUpdateSimultaneous={store.updateSimultaneous}
            onRemoveSimultaneous={store.removeSimultaneous}
          />
        )}
        {tab === 'cues' && (
          <CueSheetTab
            fireworks={store.fireworks}
            showItems={store.showItems}
            onUpdate={store.updateShowItem}
            onUpdateSimultaneous={store.updateSimultaneous}
          />
        )}
        {tab === 'map' && (
          <MapTab
            fireworks={store.fireworks}
            showItems={store.showItems}
          />
        )}
      </main>

      {showAdmin && (
        <AdminPanel currentUser={user} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      {user => <AppContent user={user} />}
    </AuthGate>
  );
}
