// Saved data. Everything lives in one IndexedDB record on this device (see db.ts).

/** The journey, in order. A project sits at one stage; reaching a stage stamps the date in `history`. */
export type Stage = 'watching' | 'backed' | 'funded' | 'production' | 'boat' | 'shipping' | 'delivered';

/** Ways a project leaves the journey early. */
export type Outcome = 'passed' | 'failed' | 'cancelled' | 'refunded';

export type Status = Stage | Outcome;

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface StageMark {
  status: Status;
  /** YYYY-MM-DD */
  at: string;
}

export type LineKind = 'pledge' | 'addon' | 'shipping' | 'tax' | 'other';

/** One thing you pay for: the pledge tier, an add-on, shipping, VAT... */
export interface MoneyLine {
  id: string;
  kind: LineKind;
  label: string;
  amount: number;
  paid: boolean;
}

export interface PledgeManager {
  /** BackerKit, Gamefound, PledgeBox... free text with suggestions. */
  service: string;
  url: string;
  /** datetime-local strings (YYYY-MM-DDTHH:mm), local time. */
  opensAt: string;
  locksAt: string;
  surveyDone: boolean;
  addressDone: boolean;
}

/** The creator moved the delivery estimate. */
export interface Delay {
  /** YYYY-MM-DD the change was noted. */
  at: string;
  /** YYYY-MM */
  from: string;
  to: string;
  note: string;
}

export interface Project {
  id: string;
  name: string;
  creator: string;
  /** Platform id from PLATFORMS, or 'other'. */
  platform: string;
  url: string;
  /** Small JPEG data URL the user picked. */
  image: string;
  category: string;
  tags: string[];
  status: Status;
  history: StageMark[];
  /** Backed after the campaign ended (late pledge / pledge manager only). */
  late: boolean;
  /** datetime-local strings, local time. Empty when unknown. */
  launchAt: string;
  endAt: string;
  tier: string;
  currency: string;
  lines: MoneyLine[];
  pm: PledgeManager;
  /** YYYY-MM. The creator's current estimate, and the first one they gave. */
  estDelivery: string;
  origDelivery: string;
  delays: Delay[];
  carrier: string;
  tracking: string;
  notes: string;
  /** No reminders or calendar nudges for this one. */
  muted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface Settings {
  theme: ThemeMode;
  currency: string;
  categories: Category[];
  /** Your name on shared projects (optional). */
  name: string;
  /** Show a phone notification when a deadline gets close (only while the app is open). */
  notify: boolean;
  /** How far ahead deadlines count as "soon" for notifications and calendar alarms. */
  warnHours: number;
}

export interface Data {
  version: 1;
  projects: Project[];
  settings: Settings;
  /** Deadline keys already notified, so each one pings once. */
  notified: string[];
}
