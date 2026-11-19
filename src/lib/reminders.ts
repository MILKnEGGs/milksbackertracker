// Reminders, kept light on purpose:
// - "Add to calendar" puts a deadline in the phone's calendar with one alert. This works with the app closed.
// - Optional notifications: while the app is open (or when it's next opened) a deadline inside the warning
//   window pings once. Offline web apps can't wake themselves up, so the calendar is the reliable one.
// - The Home Screen icon shows a badge with how many deadlines are inside the warning window.

import { DEADLINE_LABEL, countdown, icsFor, upcoming, type Deadline } from './data';
import { fileStamp, shareFile } from './files';
import { app, save } from './store.svelte';

export const canNotify = (): boolean => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

/** Deadlines worth a ping: launches and endings of things he's watching, and pledge manager locks. */
function pingable(x: Deadline): boolean {
  if (x.project.muted) return false;
  if (x.kind === 'end') return x.project.status === 'watching';
  return x.kind === 'launch' || x.kind === 'pmlock';
}

/** Deadlines inside the warning window, soonest first. */
export function dueSoon(now = Date.now()): Deadline[] {
  const win = app.d.settings.warnHours * 3600_000;
  return upcoming(app.d, now).filter((x) => pingable(x) && x.at - now <= win);
}

export async function turnOnNotifications(): Promise<boolean> {
  if (!canNotify()) return false;
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  app.d.settings.notify = p === 'granted';
  save();
  if (p === 'granted') checkReminders();
  return p === 'granted';
}

export async function checkReminders(now = Date.now()): Promise<void> {
  const soon = dueSoon(now);
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (soon.length) await nav.setAppBadge?.(soon.length);
    else await nav.clearAppBadge?.();
  } catch {
    /* badges aren't supported everywhere */
  }

  const s = app.d.settings;
  if (!s.notify || !canNotify() || Notification.permission !== 'granted') return;
  const fresh = soon.filter((x) => !app.d.notified.includes(x.key));
  if (!fresh.length) return;
  const reg = await navigator.serviceWorker.getRegistration();
  for (const x of fresh) {
    const title = `${x.project.name}`;
    const body = `${DEADLINE_LABEL[x.kind]} in ${countdown(x.at - now)}`;
    try {
      if (reg) await reg.showNotification(title, { body, tag: x.key, icon: 'pwa-192x192.png', badge: 'pwa-64x64.png', data: { hash: '#/p/' + x.project.id } });
      else new Notification(title, { body, tag: x.key });
    } catch {
      return;
    }
    app.d.notified.push(x.key);
  }
  // Forget keys for deadlines that have passed, so the list doesn't grow forever.
  const live = new Set(upcoming(app.d, now).map((x) => x.key));
  app.d.notified = app.d.notified.filter((k) => live.has(k));
  save();
}

/** Saves deadlines as a calendar file, each with one alert `warnHours` ahead. */
export async function addToCalendar(deadlines: Deadline[], name?: string): Promise<void> {
  const ics = icsFor(deadlines, app.d.settings.warnHours);
  const base = (name ?? 'deadlines').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'deadline';
  const file = new File([ics], `${base}-${fileStamp()}.ics`, { type: 'text/calendar' });
  await shareFile(file, name ?? 'Deadlines');
}
