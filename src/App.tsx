import { useState } from 'react';
import { Flame, ListOrdered, CalendarDays, FileText } from 'lucide-react';
import { useStore } from './store';
import InventoryTab from './components/InventoryTab';
import PlannerTab from './components/PlannerTab';
import CueSheetTab from './components/CueSheetTab';

type Tab = 'inventory' | 'planner' | 'cues';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'inventory', label: 'Inventory',    icon: <ListOrdered size={16} /> },
  { id: 'planner',   label: 'Show Planner', icon: <CalendarDays size={16} /> },
  { id: 'cues',      label: 'Cue Sheet',    icon: <FileText size={16} /> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('inventory');
  const store = useStore();

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Flame size={22} className="text-orange-400" />
          <span className="text-lg font-bold text-white tracking-tight">FireworksFX</span>
          <span className="text-xs text-slate-500 font-medium">Show Planner</span>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 ml-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Show stats mini */}
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span>
            <span className="text-slate-300">{store.fireworks.length}</span> fireworks
          </span>
          <span>
            <span className="text-slate-300">{store.showItems.length}</span> in show
          </span>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'inventory' && (
          <InventoryTab
            fireworks={store.fireworks}
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
            onUpdate={store.updateShowItem}
            onRemove={store.removeShowItem}
            onReorder={store.reorderShowItems}
            onClear={store.clearShow}
          />
        )}
        {tab === 'cues' && (
          <CueSheetTab
            fireworks={store.fireworks}
            showItems={store.showItems}
            onUpdate={store.updateShowItem}
          />
        )}
      </main>
    </div>
  );
}
