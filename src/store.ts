import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Firework, ShowItem, SimultaneousItem } from './types';

interface AppState {
  fireworks: Firework[];
  showItems: ShowItem[];
  overlapSeconds: number;
}

const STORAGE_KEY = 'fireworks-planner-v1';

function migrate(raw: Partial<AppState>): AppState {
  return {
    fireworks: raw.fireworks ?? [],
    showItems: (raw.showItems ?? []).map(si => ({
      ...si,
      simultaneous: si.simultaneous ?? [],
    })),
    overlapSeconds: raw.overlapSeconds ?? 0,
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {}
  return { fireworks: [], showItems: [], overlapSeconds: 0 };
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useStore() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addFirework = (fw: Firework) =>
    setState(s => ({ ...s, fireworks: [...s.fireworks, fw] }));

  const updateFirework = (fw: Firework) =>
    setState(s => ({ ...s, fireworks: s.fireworks.map(f => f.id === fw.id ? fw : f) }));

  const deleteFirework = (id: string) =>
    setState(s => ({
      ...s,
      fireworks: s.fireworks.filter(f => f.id !== id),
      showItems: s.showItems
        .filter(si => si.fireworkId !== id)
        .map(si => ({ ...si, simultaneous: si.simultaneous.filter(x => x.fireworkId !== id) })),
    }));

  const importFireworks = (fws: Firework[]) =>
    setState(s => ({ ...s, fireworks: [...s.fireworks, ...fws] }));

  const addShowItem = (item: ShowItem) =>
    setState(s => ({ ...s, showItems: [...s.showItems, item] }));

  const addShowItems = (items: ShowItem[]) =>
    setState(s => ({ ...s, showItems: [...s.showItems, ...items] }));

  const updateShowItem = (item: ShowItem) =>
    setState(s => ({ ...s, showItems: s.showItems.map(si => si.id === item.id ? item : si) }));

  const removeShowItem = (id: string) =>
    setState(s => ({ ...s, showItems: s.showItems.filter(si => si.id !== id) }));

  const reorderShowItems = (items: ShowItem[]) =>
    setState(s => ({ ...s, showItems: items }));

  const clearShow = () =>
    setState(s => ({ ...s, showItems: [] }));

  const setOverlap = (seconds: number) =>
    setState(s => ({ ...s, overlapSeconds: seconds }));

  const addSimultaneous = (showItemId: string, fw: Firework) =>
    setState(s => ({
      ...s,
      showItems: s.showItems.map(si =>
        si.id === showItemId
          ? { ...si, simultaneous: [...si.simultaneous, { id: uuid(), fireworkId: fw.id, cue: '', location: 'FC' } as SimultaneousItem] }
          : si
      ),
    }));

  const updateSimultaneous = (showItemId: string, sim: SimultaneousItem) =>
    setState(s => ({
      ...s,
      showItems: s.showItems.map(si =>
        si.id === showItemId
          ? { ...si, simultaneous: si.simultaneous.map(x => x.id === sim.id ? sim : x) }
          : si
      ),
    }));

  const removeSimultaneous = (showItemId: string, simId: string) =>
    setState(s => ({
      ...s,
      showItems: s.showItems.map(si =>
        si.id === showItemId
          ? { ...si, simultaneous: si.simultaneous.filter(x => x.id !== simId) }
          : si
      ),
    }));

  return {
    fireworks: state.fireworks,
    showItems: state.showItems,
    overlapSeconds: state.overlapSeconds,
    addFirework,
    updateFirework,
    deleteFirework,
    importFireworks,
    addShowItem,
    addShowItems,
    updateShowItem,
    removeShowItem,
    reorderShowItems,
    clearShow,
    setOverlap,
    addSimultaneous,
    updateSimultaneous,
    removeSimultaneous,
  };
}
