// Pure data helpers: stages, platforms, links, deadlines, lateness, money, stats, backups, share codes and calendar files.

import type { Category, Data, LineKind, MoneyLine, Outcome, PledgeManager, Project, Settings, Status } from './types';

export const uid = (n = 10): string => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join('');
};

// ---------------------------------------------------------------------------------------------
// Dates. Deadlines are datetime-local strings ("2026-11-21T14:00") in the phone's own time zone.

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD in local time. */
export const dayStr = (t: number | Date = Date.now()): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const monthStr = (t: number | Date = Date.now()): string => dayStr(t).slice(0, 7);

/** A datetime-local string as a timestamp, or undefined when empty or malformed. */
export function when(s: string | undefined): number | undefined {
  if (!s) return undefined;
  // A bare date means the end of that day, the safe reading for a deadline.
  const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T23:59' : s).getTime();
  return Number.isNaN(t) ? undefined : t;
}

/** Months from a to b (YYYY-MM strings). Positive when b is later. */
export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 2027" */
export function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return y && mo ? `${MONTHS[mo - 1]} ${y}` : '';
}

/** "Sat, Nov 21, 2:00 PM" */
export function whenLabel(s: string): string {
  const t = when(s);
  if (t == null) return '';
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "Nov 21, 2026" for a YYYY-MM-DD stamp. */
export function dayLabel(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Time left, short: "3d 4h", "5h 12m", "8m 30s". */
export function countdown(ms: number): string {
  if (ms <= 0) return 'ended';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d >= 1) return `${d}d ${h}h`;
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m ${pad(s % 60)}s`;
}

/** How loudly to show a countdown. */
export function urgency(ms: number): 'now' | 'soon' | 'week' | '' {
  if (ms <= 0) return '';
  if (ms < 24 * 3600_000) return 'now';
  if (ms < 72 * 3600_000) return 'soon';
  if (ms < 7 * 86400_000) return 'week';
  return '';
}

// ---------------------------------------------------------------------------------------------
// Stages

export interface StageInfo {
  id: Status;
  label: string;
  short: string;
  emoji: string;
  hint: string;
}

export const STAGES: StageInfo[] = [
  { id: 'watching', label: 'Watching', short: 'Watching', emoji: '👀', hint: 'Following it; not backed yet' },
  { id: 'backed', label: 'Backed', short: 'Backed', emoji: '🙌', hint: 'Pledged while the campaign is live' },
  { id: 'funded', label: 'Funded', short: 'Funded', emoji: '🎉', hint: 'Campaign ended and hit its goal' },
  { id: 'production', label: 'In production', short: 'Production', emoji: '🏭', hint: 'Being made' },
  { id: 'boat', label: 'On the boat', short: 'On the boat', emoji: '🚢', hint: 'Freight to the regional warehouse' },
  { id: 'shipping', label: 'Shipping to me', short: 'Shipping', emoji: '📦', hint: 'In the mail, maybe with tracking' },
  { id: 'delivered', label: 'Delivered', short: 'Delivered', emoji: '🏠', hint: 'Arrived!' },
];

export const OUTCOMES: StageInfo[] = [
  { id: 'passed', label: 'Passed', short: 'Passed', emoji: '🙅', hint: "Decided not to back it, or missed it" },
  { id: 'failed', label: 'Not funded', short: 'Not funded', emoji: '📉', hint: "Didn't reach its goal" },
  { id: 'cancelled', label: 'Cancelled', short: 'Cancelled', emoji: '🚫', hint: 'The creator cancelled it, or I pulled my pledge' },
  { id: 'refunded', label: 'Refunded', short: 'Refunded', emoji: '💸', hint: 'Money came back' },
];

const ALL = [...STAGES, ...OUTCOMES];
export const statusInfo = (s: Status): StageInfo => ALL.find((x) => x.id === s) ?? STAGES[0];
export const isOutcome = (s: Status): s is Outcome => OUTCOMES.some((o) => o.id === s);
/** 0..7 along the journey, -1 for outcomes. */
export const stageIndex = (s: Status): number => STAGES.findIndex((x) => x.id === s);

/** Backed through delivered: money is (or was) on the line. */
export const isBacking = (s: Status): boolean => stageIndex(s) >= 1;
/** Backed but not here yet. */
export const isActive = (s: Status): boolean => {
  const i = stageIndex(s);
  return i >= 1 && i <= 5;
};

/** The day a status was reached, if it was. */
export const reachedAt = (p: Project, s: Status): string | undefined => p.history.find((h) => h.status === s)?.at;

/**
 * Moves a project to a status and stamps the date. Going back along the journey forgets the later
 * stamps; an outcome replaces any earlier outcome. Returns true if pledge lines were marked paid.
 */
export function setStatus(p: Project, s: Status, today = dayStr()): boolean {
  const prev = p.status;
  p.status = s;
  if (isOutcome(s)) {
    p.history = p.history.filter((h) => !isOutcome(h.status));
  } else {
    const i = stageIndex(s);
    p.history = p.history.filter((h) => !isOutcome(h.status) && stageIndex(h.status) <= i);
  }
  if (!p.history.some((h) => h.status === s)) p.history.push({ status: s, at: today });
  p.history.sort((a, b) => order(a.status) - order(b.status));
  p.updatedAt = Date.now();
  // Campaigns charge the pledge when they fund.
  if (s === 'funded' && stageIndex(prev) < 2) {
    const due = p.lines.filter((l) => l.kind === 'pledge' && !l.paid);
    due.forEach((l) => (l.paid = true));
    return due.length > 0;
  }
  return false;
}

const order = (s: Status) => (isOutcome(s) ? 100 + OUTCOMES.findIndex((o) => o.id === s) : stageIndex(s));

// ---------------------------------------------------------------------------------------------
// Platforms and links

export interface Platform {
  id: string;
  name: string;
  host: RegExp;
}

export const PLATFORMS: Platform[] = [
  { id: 'kickstarter', name: 'Kickstarter', host: /(^|\.)kickstarter\.com$|^kck\.st$/ },
  { id: 'gamefound', name: 'Gamefound', host: /(^|\.)gamefound\.com$/ },
  { id: 'backerkit', name: 'BackerKit', host: /(^|\.)backerkit\.com$/ },
  { id: 'indiegogo', name: 'Indiegogo', host: /(^|\.)indiegogo\.com$/ },
  { id: 'crowdsupply', name: 'Crowd Supply', host: /(^|\.)crowdsupply\.com$/ },
  { id: 'other', name: 'Other', host: /^$/ },
];

export const platformName = (id: string): string => PLATFORMS.find((p) => p.id === id)?.name ?? 'Other';

export const PM_SERVICES = ['BackerKit', 'Gamefound', 'PledgeBox', 'CrowdOx', 'PledgeManager', 'Kickstarter', 'Creator website'];

const titleCase = (slug: string): string =>
  decodeURIComponent(slug)
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export interface LinkInfo {
  platform: string;
  name?: string;
  creator?: string;
  url: string;
}

/**
 * Reads what it can from a campaign link: the platform, and a name and creator from the address
 * itself ("kickstarter.com/projects/acme-games/sky-forge" → Sky Forge by Acme Games). The pages
 * themselves can't be read from an offline app, so this is the best it gets.
 */
export function parseLink(raw: string): LinkInfo | undefined {
  const text = raw.trim().match(/https?:\/\/\S+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/i)?.[0];
  if (!text) return undefined;
  let u: URL;
  try {
    u = new URL(/^https?:/i.test(text) ? text : 'https://' + text);
  } catch {
    return undefined;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const platform = PLATFORMS.find((p) => p.host.test(host))?.id ?? 'other';
  const parts = u.pathname.split('/').filter(Boolean);
  const url = u.origin + u.pathname.replace(/\/(rewards|description|faqs|comments|posts|community|updates)\/?$/, '');
  const named = (creator: string | undefined, slug: string | undefined): LinkInfo => ({
    platform,
    url,
    name: slug ? titleCase(slug) : undefined,
    // Kickstarter sometimes puts a number where the creator goes.
    creator: creator && !/^\d+$/.test(creator) ? titleCase(creator) : undefined,
  });
  if (platform === 'kickstarter' || platform === 'gamefound') {
    const i = parts.indexOf('projects');
    if (i >= 0) return named(parts[i + 1], parts[i + 2]);
  } else if (platform === 'backerkit') {
    const i = parts.indexOf('projects');
    if (i >= 0) return named(parts[i + 1], parts[i + 2]);
    if (parts[0] === 'c' && parts.length >= 3) return named(parts[1], parts[2]);
  } else if (platform === 'indiegogo') {
    const i = parts.indexOf('projects');
    if (i >= 0) return named(undefined, parts[i + 1]);
  } else if (platform === 'crowdsupply') {
    if (parts.length >= 2) return named(parts[0], parts[1]);
  }
  return { platform, url };
}

// ---------------------------------------------------------------------------------------------
// Money

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'MXN', 'BRL', 'SGD', 'HKD', 'KRW', 'CNY'];

export const LINE_KINDS: { id: LineKind; label: string; placeholder: string }[] = [
  { id: 'pledge', label: 'Pledge', placeholder: 'All-in pledge' },
  { id: 'addon', label: 'Add-on', placeholder: 'Playmat' },
  { id: 'shipping', label: 'Shipping', placeholder: 'Shipping' },
  { id: 'tax', label: 'Tax / VAT', placeholder: 'Sales tax' },
  { id: 'other', label: 'Other', placeholder: 'Fee' },
];

const fmts = new Map<string, Intl.NumberFormat>();
export function money(n: number, currency: string): string {
  let f = fmts.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, { style: 'currency', currency });
    } catch {
      f = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    fmts.set(currency, f);
  }
  return f.format(n);
}

const cents = (n: number) => Math.round(n * 100) / 100;

export interface Totals {
  total: number;
  paid: number;
  owed: number;
}

export function totals(p: Project): Totals {
  let total = 0;
  let paid = 0;
  for (const l of p.lines) {
    total += l.amount || 0;
    if (l.paid) paid += l.amount || 0;
  }
  return { total: cents(total), paid: cents(paid), owed: cents(total - paid) };
}

export const newLine = (kind: LineKind, label = '', amount = 0): MoneyLine => ({ id: uid(6), kind, label, amount, paid: false });

// ---------------------------------------------------------------------------------------------
// Lateness

/**
 * How many months past the creator's first estimate this is: arrived that late, or is that late
 * now and still not here. 0 when on time or there's no estimate.
 */
export function monthsLate(p: Project, now = Date.now()): number {
  const ref = p.origDelivery || p.estDelivery;
  if (!ref || !isBacking(p.status)) return 0;
  const got = reachedAt(p, 'delivered');
  if (p.status === 'delivered' && got) return Math.max(0, monthDiff(ref, got.slice(0, 7)));
  return Math.max(0, monthDiff(ref, monthStr(now)));
}

/** Months the creator has pushed the estimate back in total. */
export const monthsPushed = (p: Project): number =>
  p.origDelivery && p.estDelivery ? Math.max(0, monthDiff(p.origDelivery, p.estDelivery)) : 0;

/**
 * Sets the delivery estimate. The first one is remembered as the original; later changes are
 * logged as delays. Returns the delay that was logged, if any.
 */
export function setEstimate(p: Project, month: string, today = dayStr()) {
  const prev = p.estDelivery;
  p.estDelivery = month;
  p.updatedAt = Date.now();
  if (!month) return undefined;
  if (!p.origDelivery) {
    p.origDelivery = month;
    return undefined;
  }
  if (!prev || prev === month) return undefined;
  const delay = { at: today, from: prev, to: month, note: '' };
  p.delays.push(delay);
  return delay;
}

export const lateLabel = (n: number): string => (n <= 0 ? '' : n === 1 ? '1 month late' : n < 24 ? `${n} months late` : `${(n / 12).toFixed(n % 12 ? 1 : 0)} years late`);

// ---------------------------------------------------------------------------------------------
// Deadlines

export type DeadlineKind = 'launch' | 'end' | 'pmopen' | 'pmlock';

export interface Deadline {
  key: string;
  kind: DeadlineKind;
  at: number;
  project: Project;
}

export const DEADLINE_LABEL: Record<DeadlineKind, string> = {
  launch: 'Launches',
  end: 'Campaign ends',
  pmopen: 'Pledge manager opens',
  pmlock: 'Pledge manager locks',
};

/** The dates that still matter for a project at its current stage. */
export function deadlinesOf(p: Project): Deadline[] {
  const out: Deadline[] = [];
  const add = (kind: DeadlineKind, s: string) => {
    const at = when(s);
    if (at != null) out.push({ key: `${p.id}:${kind}:${s}`, kind, at, project: p });
  };
  const i = stageIndex(p.status);
  if (p.status === 'watching') add('launch', p.launchAt);
  if (i === 0 || i === 1) add('end', p.endAt);
  if (i >= 0 && i <= 3) {
    add('pmopen', p.pm.opensAt);
    add('pmlock', p.pm.locksAt);
  }
  return out;
}

/** Upcoming deadlines across all projects, soonest first. */
export function upcoming(d: Data, now = Date.now()): Deadline[] {
  return d.projects
    .flatMap(deadlinesOf)
    .filter((x) => x.at > now)
    .sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------------------------------------
// Dashboard

export interface Nudge {
  project: Project;
  kind: 'didback' | 'didfund' | 'pmlock' | 'survey' | 'owed';
  /** For sorting: sooner or older first. */
  at: number;
}

/** Things waiting on him: questions about ended campaigns, pledge managers, money owed. */
export function nudges(d: Data, now = Date.now()): Nudge[] {
  const out: Nudge[] = [];
  for (const p of d.projects) {
    const end = when(p.endAt);
    if (end != null && end <= now && now - end < 120 * 86400_000) {
      if (p.status === 'watching') out.push({ project: p, kind: 'didback', at: end });
      if (p.status === 'backed') out.push({ project: p, kind: 'didfund', at: end });
    }
    const i = stageIndex(p.status);
    const lock = when(p.pm.locksAt);
    // One row per project: a pledge manager row also mentions money owed.
    if (i >= 1 && i <= 3 && lock != null && lock > now) out.push({ project: p, kind: 'pmlock', at: lock });
    else if (i >= 2 && i <= 3 && (p.pm.service || p.pm.url) && (!p.pm.surveyDone || !p.pm.addressDone)) out.push({ project: p, kind: 'survey', at: p.updatedAt });
    else if (i >= 2 && i <= 5 && totals(p).owed > 0) out.push({ project: p, kind: 'owed', at: p.updatedAt });
  }
  return out.sort((a, b) => a.at - b.at);
}

export const onItsWay = (d: Data): Project[] =>
  d.projects.filter((p) => p.status === 'boat' || p.status === 'shipping').sort((a, b) => stageIndex(b.status) - stageIndex(a.status) || a.name.localeCompare(b.name));

/** Late and still not here, latest first. */
export const runningLate = (d: Data, now = Date.now()): Project[] =>
  d.projects
    .filter((p) => isActive(p.status) && monthsLate(p, now) > 0)
    .sort((a, b) => monthsLate(b, now) - monthsLate(a, now));

// ---------------------------------------------------------------------------------------------
// Lists

export type Group = '' | 'following' | 'active' | 'coming' | 'delivered' | 'closed';

export const GROUPS: { id: Group; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'following', label: '👀 Watching' },
  { id: 'active', label: '🙌 Backed' },
  { id: 'coming', label: '🚢 On its way' },
  { id: 'delivered', label: '🏠 Delivered' },
  { id: 'closed', label: 'Closed' },
];

export function inGroup(p: Project, g: Group): boolean {
  const i = stageIndex(p.status);
  switch (g) {
    case 'following':
      return i === 0;
    case 'active':
      return i >= 1 && i <= 3;
    case 'coming':
      return i === 4 || i === 5;
    case 'delivered':
      return i === 6;
    case 'closed':
      return i < 0;
    default:
      return true;
  }
}

export type SortKey = 'next' | 'name' | 'delivery' | 'amount' | 'updated';

export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'next', label: 'Next date' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'amount', label: 'Amount' },
  { id: 'updated', label: 'Recently changed' },
  { id: 'name', label: 'Name' },
];

/** The next date that matters for a project, for sorting: a deadline, else the delivery estimate. */
function nextDate(p: Project, now: number): number {
  const dl = deadlinesOf(p)
    .filter((x) => x.at > now)
    .map((x) => x.at);
  if (dl.length) return Math.min(...dl);
  if (p.estDelivery && isActive(p.status)) return 1e13 + (when(p.estDelivery + '-28') ?? 0);
  return 3e13 - p.updatedAt / 1000;
}

export function sortProjects(list: Project[], key: SortKey, now = Date.now()): Project[] {
  const by = {
    next: (a: Project, b: Project) => nextDate(a, now) - nextDate(b, now),
    name: (a: Project, b: Project) => a.name.localeCompare(b.name),
    delivery: (a: Project, b: Project) => (a.estDelivery || '9999').localeCompare(b.estDelivery || '9999') || a.name.localeCompare(b.name),
    amount: (a: Project, b: Project) => totals(b).total - totals(a).total,
    updated: (a: Project, b: Project) => b.updatedAt - a.updatedAt,
  }[key];
  return [...list].sort(by);
}

export function search(list: Project[], q: string): Project[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter((p) => {
    const hay = [p.name, p.creator, platformName(p.platform), p.tier, p.notes, ...p.tags, ...p.lines.map((l) => l.label)].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export function allTags(d: Data): string[] {
  const seen = new Map<string, string>();
  for (const p of d.projects) for (const t of p.tags) if (!seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------------------------
// Stats

export interface YearStats {
  backed: number;
  delivered: number;
  /** Per currency: everything pledged, what's been paid, and what's still to pay. */
  money: Record<string, Totals>;
  byCategory: { id: string; count: number; money: Record<string, number> }[];
  byPlatform: { id: string; count: number }[];
  avgLate: number | undefined;
}

/** The year a backing counts toward: when it was backed. */
export const backedYear = (p: Project): number => Number((reachedAt(p, 'backed') ?? reachedAt(p, p.status) ?? dayStr(p.createdAt)).slice(0, 4));

/** Stats for backings made in `year` (or all time when year is 0). Refunds, failures and cancellations don't count. */
export function stats(d: Data, year: number, now = Date.now()): YearStats {
  const list = d.projects.filter((p) => isBacking(p.status) && (!year || backedYear(p) === year));
  const money: Record<string, Totals> = {};
  const cats = new Map<string, { id: string; count: number; money: Record<string, number> }>();
  const plats = new Map<string, number>();
  const lates: number[] = [];
  for (const p of list) {
    const t = totals(p);
    const m = (money[p.currency] ??= { total: 0, paid: 0, owed: 0 });
    m.total = cents(m.total + t.total);
    m.paid = cents(m.paid + t.paid);
    m.owed = cents(m.owed + t.owed);
    const c = cats.get(p.category) ?? { id: p.category, count: 0, money: {} };
    c.count++;
    c.money[p.currency] = cents((c.money[p.currency] ?? 0) + t.total);
    cats.set(p.category, c);
    plats.set(p.platform, (plats.get(p.platform) ?? 0) + 1);
    if (p.status === 'delivered' && (p.origDelivery || p.estDelivery)) lates.push(monthsLate(p, now));
  }
  return {
    backed: list.length,
    delivered: list.filter((p) => p.status === 'delivered').length,
    money,
    byCategory: [...cats.values()].sort((a, b) => b.count - a.count),
    byPlatform: [...plats].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    avgLate: lates.length ? lates.reduce((a, b) => a + b, 0) / lates.length : undefined,
  };
}

export function years(d: Data): number[] {
  const ys = new Set(d.projects.filter((p) => isBacking(p.status)).map(backedYear));
  ys.add(new Date().getFullYear());
  return [...ys].sort((a, b) => b - a);
}

// ---------------------------------------------------------------------------------------------
// New data and loading saved data

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'board', name: 'Board games', emoji: '🎲' },
  { id: 'minis', name: 'Miniatures', emoji: '⚔️' },
  { id: 'cards', name: 'Card games', emoji: '🃏' },
  { id: 'rpg', name: 'RPGs', emoji: '🐉' },
  { id: 'video', name: 'Video games', emoji: '🎮' },
  { id: 'books', name: 'Books & comics', emoji: '📚' },
  { id: 'tech', name: 'Tech & gadgets', emoji: '🔌' },
  { id: 'art', name: 'Art & prints', emoji: '🎨' },
  { id: 'toys', name: 'Toys & figures', emoji: '🧸' },
  { id: 'other', name: 'Other', emoji: '📦' },
];

function guessCurrency(): string {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    const map: Record<string, string> = { GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', MX: 'MXN', BR: 'BRL' };
    const euro = ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR', 'SK', 'SI', 'LU', 'LV', 'LT', 'EE', 'MT', 'CY', 'HR'];
    return map[region ?? ''] ?? (euro.includes(region ?? '') ? 'EUR' : 'USD');
  } catch {
    return 'USD';
  }
}

export const newSettings = (): Settings => ({
  theme: 'dark',
  currency: typeof navigator === 'undefined' ? 'USD' : guessCurrency(),
  categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
  name: '',
  notify: false,
  warnHours: 48,
});

export const newData = (): Data => ({ version: 1, projects: [], settings: newSettings(), notified: [] });

const emptyPm = (): PledgeManager => ({ service: '', url: '', opensAt: '', locksAt: '', surveyDone: false, addressDone: false });

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown): boolean => v === true;
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function normalizeProject(raw: Partial<Project>, d?: Data): Project {
  const now = Date.now();
  // "Pledge manager" used to be a stage; those projects are Funded now (the pledge manager card stays).
  const rawStatus = (raw.status as string) === 'pm' ? 'funded' : raw.status;
  const status = ALL.some((s) => s.id === rawStatus) ? (rawStatus as Status) : 'watching';
  const pm = { ...emptyPm(), ...(raw.pm ?? {}) };
  return {
    id: str(raw.id) || uid(),
    name: str(raw.name).trim() || 'Untitled project',
    creator: str(raw.creator),
    platform: PLATFORMS.some((p) => p.id === raw.platform) ? raw.platform! : 'other',
    url: str(raw.url),
    image: str(raw.image).startsWith('data:image/') ? raw.image! : '',
    category: str(raw.category) || 'other',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()) : [],
    status,
    history: Array.isArray(raw.history)
      ? raw.history.filter((h) => h && ALL.some((s) => s.id === h.status) && typeof h.at === 'string')
      : [{ status, at: dayStr(now) }],
    late: bool(raw.late),
    launchAt: str(raw.launchAt),
    endAt: str(raw.endAt),
    tier: str(raw.tier),
    currency: str(raw.currency) || d?.settings.currency || 'USD',
    lines: Array.isArray(raw.lines)
      ? raw.lines
          .filter((l) => l && typeof l === 'object')
          .map((l) => ({
            id: str(l.id) || uid(6),
            kind: LINE_KINDS.some((k) => k.id === l.kind) ? l.kind : 'other',
            label: str(l.label),
            amount: num(l.amount),
            paid: bool(l.paid),
          }))
      : [],
    pm: {
      service: str(pm.service),
      url: str(pm.url),
      opensAt: str(pm.opensAt),
      locksAt: str(pm.locksAt),
      surveyDone: bool(pm.surveyDone),
      addressDone: bool(pm.addressDone),
    },
    estDelivery: str(raw.estDelivery),
    origDelivery: str(raw.origDelivery),
    delays: Array.isArray(raw.delays) ? raw.delays.filter((x) => x && typeof x.to === 'string').map((x) => ({ at: str(x.at), from: str(x.from), to: x.to, note: str(x.note) })) : [],
    carrier: str(raw.carrier),
    tracking: str(raw.tracking),
    notes: str(raw.notes),
    muted: bool(raw.muted),
    createdAt: num(raw.createdAt) || now,
    updatedAt: num(raw.updatedAt) || now,
  };
}

export function normalize(raw: unknown): Data {
  const r = (raw ?? {}) as Partial<Data>;
  const base = newSettings();
  const s = { ...base, ...(r.settings ?? {}) } as Settings;
  if (!Array.isArray(s.categories) || !s.categories.length) s.categories = base.categories;
  s.categories = s.categories.filter((c) => c && typeof c.id === 'string').map((c) => ({ id: c.id, name: str(c.name) || 'Category', emoji: str(c.emoji) || '📦' }));
  if (!['dark', 'light', 'auto'].includes(s.theme)) s.theme = 'dark';
  if (!(s.warnHours > 0)) s.warnHours = 48;
  const d: Data = { version: 1, projects: [], settings: s, notified: Array.isArray(r.notified) ? r.notified.filter((x) => typeof x === 'string') : [] };
  d.projects = Array.isArray(r.projects) ? r.projects.map((p) => normalizeProject(p, d)) : [];
  return d;
}

export function newProject(d: Data, fields: Partial<Project> = {}): Project {
  const p = normalizeProject({ currency: d.settings.currency, ...fields, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }, d);
  if (!fields.history) p.history = [{ status: p.status, at: dayStr() }];
  return p;
}

export const categoryOf = (d: Data, id: string): Category => d.settings.categories.find((c) => c.id === id) ?? { id, name: 'Other', emoji: '📦' };

export function move<T>(arr: T[], from: number, to: number): void {
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
}

/** A copy with a fresh id and history, for backing the next wave or a reprint. */
export function duplicate(d: Data, p: Project): Project {
  const copy = normalizeProject(JSON.parse(JSON.stringify(p)), d);
  copy.id = uid();
  copy.name = p.name + ' (copy)';
  copy.status = 'watching';
  copy.history = [{ status: 'watching', at: dayStr() }];
  copy.lines = copy.lines.map((l) => ({ ...l, id: uid(6), paid: false }));
  copy.pm = { ...copy.pm, surveyDone: false, addressDone: false };
  copy.delays = [];
  copy.origDelivery = copy.estDelivery;
  copy.tracking = '';
  copy.createdAt = copy.updatedAt = Date.now();
  return copy;
}

// ---------------------------------------------------------------------------------------------
// Backup

export const backupJson = (d: Data): string => JSON.stringify({ app: 'milksbackertracker', ...d }, null, 1);

export function parseBackup(text: string): Data {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Backer Tracker backup (it isn't JSON).");
  }
  const r = raw as { app?: string; projects?: unknown };
  if (r?.app !== 'milksbackertracker' || !Array.isArray(r.projects)) throw new Error("That file isn't a Backer Tracker backup.");
  return normalize(raw);
}

// ---------------------------------------------------------------------------------------------
// Share codes: "MBT:" + base64url(JSON). Copy/paste only, because on iPhone a link opens Safari,
// whose storage is separate from the Home Screen app. Money, notes and the picture stay private.

export interface ShareProject {
  n: string; // name
  c?: string; // creator
  p?: string; // platform id
  u?: string; // link
  k?: { n: string; e: string }; // category
  l?: string; // launchAt
  e?: string; // endAt
  d?: string; // estDelivery
  t?: string; // tier
  m?: string; // a note from the sender
}

export interface Share {
  v: 1;
  from?: string;
  items: ShareProject[];
}

const PREFIX = 'MBT:';

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const opt = (s: string) => s || undefined;

export function shareProject(d: Data, p: Project, withTier = false): ShareProject {
  const cat = categoryOf(d, p.category);
  return {
    n: p.name,
    c: opt(p.creator),
    p: p.platform === 'other' ? undefined : p.platform,
    u: opt(p.url),
    k: { n: cat.name, e: cat.emoji },
    l: opt(p.launchAt),
    e: opt(p.endAt),
    d: opt(p.estDelivery),
    t: withTier ? opt(p.tier) : undefined,
  };
}

export const encodeShare = (s: Share): string => PREFIX + b64url(JSON.stringify(s));

/** Finds an MBT: code anywhere in pasted text (the whole message usually gets pasted). */
export function decodeShare(text: string): Share | undefined {
  const m = text.match(/MBT:([A-Za-z0-9_-]+)/);
  if (!m) return undefined;
  try {
    const s = JSON.parse(unb64url(m[1])) as Share;
    if (!Array.isArray(s.items)) return undefined;
    s.items = s.items.filter((i) => i && typeof i.n === 'string' && i.n.trim());
    return s.items.length ? s : undefined;
  } catch {
    return undefined;
  }
}

/** The readable message that goes with a code. */
export function shareText(s: Share): string {
  const lines = s.items.map((i) => {
    const bits = [i.c && `by ${i.c}`, i.p && platformName(i.p)].filter(Boolean).join(' on ');
    const end = i.e && when(i.e) ? `\n  Ends ${whenLabel(i.e)}` : i.l && when(i.l) ? `\n  Launches ${whenLabel(i.l)}` : '';
    const note = i.m ? `\n  “${i.m}”` : '';
    return `• ${i.n}${bits ? ` (${bits})` : ''}${end}${i.u ? `\n  ${i.u}` : ''}${note}`;
  });
  const head = s.from ? `${s.from} thinks you'd like ${s.items.length === 1 ? 'this' : 'these'}:` : `Check ${s.items.length === 1 ? 'this' : 'these'} out:`;
  return `${head}\n${lines.join('\n')}\n\nGot Milk's Backer Tracker? Copy this whole message and tap “Paste a shared project”.\n${encodeShare(s)}`;
}

const cleanUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');

/** The project you already have that matches a shared one (same link, or same name). */
export function findSame(d: Data, si: ShareProject): Project | undefined {
  const u = si.u ? cleanUrl(si.u) : '';
  return d.projects.find((p) => (u && p.url && cleanUrl(p.url) === u) || p.name.trim().toLowerCase() === si.n.trim().toLowerCase());
}

export function projectFromShare(d: Data, si: ShareProject, from?: string): Project {
  let cat = si.k ? d.settings.categories.find((c) => c.name.toLowerCase() === si.k!.n.toLowerCase()) : undefined;
  if (!cat && si.k) {
    cat = { id: uid(6), name: si.k.n, emoji: si.k.e || '📦' };
    d.settings.categories.push(cat);
  }
  const note = [from && `Shared by ${from}`, si.m && `“${si.m}”`].filter(Boolean).join(': ');
  return newProject(d, {
    name: si.n,
    creator: si.c ?? '',
    platform: si.p ?? 'other',
    url: si.u ?? '',
    category: cat?.id ?? 'other',
    launchAt: si.l ?? '',
    endAt: si.e ?? '',
    estDelivery: si.d ?? '',
    origDelivery: si.d ?? '',
    tier: si.t ?? '',
    notes: note,
    status: 'watching',
  });
}

// ---------------------------------------------------------------------------------------------
// Calendar files (.ics) so the phone's own calendar does the alerting, even with the app closed.

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
const icsTime = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Long lines must be folded at 75 octets; folding at 70 characters keeps it simple and safe. */
const fold = (line: string) => line.match(/.{1,70}/gu)?.join('\r\n ') ?? line;

export function icsFor(deadlines: Deadline[], warnHours: number, now = Date.now()): string {
  const events = deadlines.map((x) => {
    const p = x.project;
    const title = `${DEADLINE_LABEL[x.kind]}: ${p.name}`;
    const link = x.kind.startsWith('pm') ? p.pm.url || p.url : p.url;
    const lines = [
      'BEGIN:VEVENT',
      `UID:${x.key.replace(/[^A-Za-z0-9:-]/g, '')}@milksbackertracker`,
      `DTSTAMP:${icsTime(now)}`,
      `DTSTART:${icsTime(x.at - 30 * 60_000)}`,
      `DTEND:${icsTime(x.at)}`,
      `SUMMARY:${icsEscape(title)}`,
      `DESCRIPTION:${icsEscape(`${title} at ${new Date(x.at).toLocaleString()}.${link ? '\n' + link : ''}`)}`,
      link ? `URL:${icsEscape(link)}` : '',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(title)}`,
      `TRIGGER:-PT${Math.max(1, Math.round(warnHours))}H`,
      'END:VALARM',
      'END:VEVENT',
    ];
    return lines.filter(Boolean).map(fold).join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', "PRODID:-//Milk's Backer Tracker//EN", 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}
