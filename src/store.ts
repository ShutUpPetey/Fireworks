import { useState, useEffect } from 'react';
import type { Firework, ShowItem } from './types';

interface AppState {
  fireworks: Firework[];
  showItems: ShowItem[];
}

const STORAGE_KEY = 'fireworks-planner-v1';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { fireworks: [], showItems: [] };
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

  const addFirework = (fw: Firework) => {
    setState(s => ({ ...s, fireworks: [...s.fireworks, fw] }));
  };

  const updateFirework = (fw: Firework) => {
    setState(s => ({ ...s, fireworks: s.fireworks.map(f => f.id === fw.id ? fw : f) }));
  };

  const deleteFirework = (id: string) => {
    setState(s => ({
      fireworks: s.fireworks.filter(f => f.id !== id),
      showItems: s.showItems.filter(si => si.fireworkId !== id),
    }));
  };

  const importFireworks = (fws: Firework[]) => {
    setState(s => ({ ...s, fireworks: [...s.fireworks, ...fws] }));
  };

  const addShowItem = (item: ShowItem) => {
    setState(s => ({ ...s, showItems: [...s.showItems, item] }));
  };

  const updateShowItem = (item: ShowItem) => {
    setState(s => ({ ...s, showItems: s.showItems.map(si => si.id === item.id ? item : si) }));
  };

  const removeShowItem = (id: string) => {
    setState(s => ({ ...s, showItems: s.showItems.filter(si => si.id !== id) }));
  };

  const reorderShowItems = (items: ShowItem[]) => {
    setState(s => ({ ...s, showItems: items }));
  };

  const clearShow = () => {
    setState(s => ({ ...s, showItems: [] }));
  };

  return {
    fireworks: state.fireworks,
    showItems: state.showItems,
    addFirework,
    updateFirework,
    deleteFirework,
    importFireworks,
    addShowItem,
    updateShowItem,
    removeShowItem,
    reorderShowItems,
    clearShow,
  };
}
