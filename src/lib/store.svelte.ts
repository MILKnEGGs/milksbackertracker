// App state: the saved data, the hash route, saving, toasts and a ticking clock for countdowns.

import { newData, normalize } from './data';
import { loadData, saveData } from './db';
import type { Data, Project } from './types';

export const app = $state<{ d: Data; loaded: boolean }>({ d: newData(), loaded: false });

export async function load(): Promise<void> {
  const stored = await loadData();
  if (stored) app.d = normalize(stored);
  app.loaded = true;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Saves soon; debounced so typing in a field doesn't write on every keystroke. */
export function save(): void {
  clearTimeout(timer);
  timer = setTimeout(() => saveData(app.d).catch((err) => alert('Could not save: ' + err)), 150);
}

/** Saves a change to one project and marks it as recently changed. */
export function touch(p: Project): void {
  p.updatedAt = Date.now();
  save();
}

/** Replaces everything (backup import, erase). */
export async function replaceData(d: Data): Promise<void> {
  clearTimeout(timer);
  app.d = d;
  await saveData(d);
}

// Write any pending change before the app is closed or sent to the background.
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && timer) {
    clearTimeout(timer);
    timer = undefined;
    saveData(app.d).catch(() => {});
  }
});

export const projectById = (id: string | undefined): Project | undefined => app.d.projects.find((p) => p.id === id);

// ---------------------------------------------------------------------------------------------
// Clock: countdowns read clock.now, which ticks every second while the app is visible.

export const clock = $state({ now: Date.now() });
setInterval(() => {
  if (document.visibilityState === 'visible') clock.now = Date.now();
}, 1000);
addEventListener('visibilitychange', () => (clock.now = Date.now()));

// ---------------------------------------------------------------------------------------------
// Routing

export interface Route {
  page: 'home' | 'projects' | 'project' | 'money' | 'settings' | 'install';
  arg?: string;
}

const PAGES: Record<string, Route['page']> = {
  projects: 'projects',
  p: 'project',
  money: 'money',
  settings: 'settings',
  install: 'install',
};

function parse(hash: string): Route {
  const [page, arg] = hash.replace(/^#\/?/, '').split('/');
  return { page: PAGES[page] ?? 'home', arg: arg ? decodeURIComponent(arg) : undefined };
}

export const router = $state({ route: parse(location.hash) });

addEventListener('hashchange', () => {
  router.route = parse(location.hash);
  scrollTo(0, 0);
});

export function go(path: string, replace = false): void {
  if (replace) {
    history.replaceState(null, '', '#/' + path);
    router.route = parse(location.hash);
    scrollTo(0, 0);
  } else location.hash = '#/' + path;
}

export function back(fallback = ''): void {
  if (history.length > 1) history.back();
  else go(fallback);
}

// ---------------------------------------------------------------------------------------------
// Toasts

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

export const toasts = $state<Toast[]>([]);
let toastId = 0;

export function toast(text: string, action?: Toast['action'], ms = 5000): number {
  const t = { id: ++toastId, text, action };
  toasts.push(t);
  setTimeout(() => dismissToast(t.id), ms);
  return t.id;
}

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

export const isStandalone =
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// ---------------------------------------------------------------------------------------------
// Project list filters, kept while the app is open so coming back from a project keeps your place.

import type { Group, SortKey } from './data';

export const listView = $state<{ group: Group; category: string; tag: string; sort: SortKey; q: string }>({
  group: '',
  category: '',
  tag: '',
  sort: 'next',
  q: '',
});
