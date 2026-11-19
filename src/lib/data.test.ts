import { describe, expect, it } from 'vitest';
import {
  backupJson,
  countdown,
  decodeShare,
  deadlinesOf,
  encodeShare,
  findSame,
  icsFor,
  monthsLate,
  newData,
  newLine,
  newProject,
  normalize,
  nudges,
  parseBackup,
  parseLink,
  projectFromShare,
  runningLate,
  setEstimate,
  setStatus,
  shareProject,
  stats,
  totals,
  upcoming,
} from './data';

const at = (s: string) => new Date(s).getTime();

describe('parseLink', () => {
  it('reads Kickstarter name and creator from the address', () => {
    expect(parseLink('https://www.kickstarter.com/projects/acme-games/sky-forge-second-printing?ref=discovery')).toEqual({
      platform: 'kickstarter',
      url: 'https://www.kickstarter.com/projects/acme-games/sky-forge-second-printing',
      name: 'Sky Forge Second Printing',
      creator: 'Acme Games',
    });
  });

  it('drops tab paths and numeric creators', () => {
    const r = parseLink('kickstarter.com/projects/123456/dragon-dice/rewards');
    expect(r?.url).toBe('https://kickstarter.com/projects/123456/dragon-dice');
    expect(r?.creator).toBeUndefined();
    expect(r?.name).toBe('Dragon Dice');
  });

  it('knows Gamefound, BackerKit, Indiegogo and finds links inside text', () => {
    expect(parseLink('Look! https://gamefound.com/en/projects/awaken-realms/tainted-grail-2 so good')?.platform).toBe('gamefound');
    expect(parseLink('https://www.backerkit.com/c/projects/foo-studio/bar-quest')?.name).toBe('Bar Quest');
    expect(parseLink('https://www.indiegogo.com/projects/smart-mug')?.name).toBe('Smart Mug');
    expect(parseLink('https://example.com/thing')?.platform).toBe('other');
    expect(parseLink('no link here')).toBeUndefined();
  });
});

describe('stages', () => {
  it('stamps dates, forgets later stamps when going back, and marks the pledge paid on funding', () => {
    const d = newData();
    const p = newProject(d, { name: 'X', status: 'watching' });
    p.lines.push(newLine('pledge', 'Pledge', 100), newLine('shipping', 'Ship', 20));
    setStatus(p, 'backed', '2026-01-01');
    expect(setStatus(p, 'funded', '2026-02-01')).toBe(true);
    expect(totals(p)).toEqual({ total: 120, paid: 100, owed: 20 });
    setStatus(p, 'boat', '2026-06-01');
    setStatus(p, 'pm', '2026-07-01');
    expect(p.history.map((h) => h.status)).toEqual(['watching', 'backed', 'funded', 'pm']);
    setStatus(p, 'refunded', '2026-08-01');
    expect(p.history.at(-1)).toEqual({ status: 'refunded', at: '2026-08-01' });
    setStatus(p, 'delivered', '2026-09-01');
    expect(p.history.some((h) => h.status === 'refunded')).toBe(false);
  });
});

describe('deadlines and nudges', () => {
  it('shows launch/end only while they matter, soonest first', () => {
    const d = newData();
    const a = newProject(d, { name: 'A', status: 'watching', launchAt: '2026-12-01T10:00', endAt: '2026-12-30T10:00' });
    const b = newProject(d, { name: 'B', status: 'production', endAt: '2026-12-02T10:00' });
    b.pm.locksAt = '2026-11-25T12:00';
    d.projects.push(a, b);
    expect(deadlinesOf(b)).toEqual([]);
    const up = upcoming(d, at('2026-11-20T00:00'));
    expect(up.map((x) => x.kind)).toEqual(['launch', 'end']);
  });

  it('asks about ended campaigns and pledge managers', () => {
    const d = newData();
    const w = newProject(d, { name: 'W', status: 'watching', endAt: '2026-11-10T10:00' });
    const b = newProject(d, { name: 'B', status: 'backed', endAt: '2026-11-11T10:00' });
    const f = newProject(d, { name: 'F', status: 'funded' });
    f.pm.locksAt = '2026-11-30T10:00';
    const pm = newProject(d, { name: 'PM', status: 'pm' });
    pm.lines.push(newLine('shipping', 'Ship', 30));
    d.projects.push(w, b, f, pm);
    const kinds = nudges(d, at('2026-11-19T00:00')).map((n) => `${n.project.name}:${n.kind}`);
    expect(kinds).toContain('W:didback');
    expect(kinds).toContain('B:didfund');
    expect(kinds).toContain('F:pmlock');
    expect(kinds).toContain('PM:survey');
    expect(kinds).toContain('PM:owed');
  });

  it('formats countdowns', () => {
    expect(countdown(3 * 86400_000 + 4 * 3600_000 + 5000)).toBe('3d 4h');
    expect(countdown(5 * 3600_000 + 12 * 60_000)).toBe('5h 12m');
    expect(countdown(8 * 60_000 + 30_000)).toBe('8m 30s');
    expect(countdown(0)).toBe('ended');
  });
});

describe('lateness', () => {
  it('remembers the first estimate and logs delays', () => {
    const d = newData();
    const p = newProject(d, { name: 'L', status: 'backed' });
    setEstimate(p, '2026-03', '2025-06-01');
    expect(setEstimate(p, '2026-03')).toBeUndefined();
    const delay = setEstimate(p, '2026-09', '2026-02-10');
    expect(delay).toEqual({ at: '2026-02-10', from: '2026-03', to: '2026-09', note: '' });
    expect(p.origDelivery).toBe('2026-03');
    setStatus(p, 'production');
    d.projects.push(p);
    expect(monthsLate(p, at('2026-03-20T00:00'))).toBe(0);
    expect(monthsLate(p, at('2026-11-19T00:00'))).toBe(8);
    expect(runningLate(d, at('2026-11-19T00:00'))).toEqual([p]);
  });

  it('measures delivered projects by their delivery date', () => {
    const d = newData();
    const p = newProject(d, { name: 'L', status: 'backed', origDelivery: '2026-01', estDelivery: '2026-01' });
    setStatus(p, 'delivered', '2026-04-15');
    expect(monthsLate(p, at('2027-01-01T00:00'))).toBe(3);
  });
});

describe('stats', () => {
  it('totals per currency by the year it was backed, skipping refunds', () => {
    const d = newData();
    const a = newProject(d, { name: 'A', status: 'watching', currency: 'USD' });
    a.lines.push(newLine('pledge', '', 100));
    setStatus(a, 'backed', '2026-02-01');
    const b = newProject(d, { name: 'B', status: 'watching', currency: 'EUR' });
    b.lines.push({ ...newLine('pledge', '', 50), paid: true });
    setStatus(b, 'backed', '2026-05-01');
    const c = newProject(d, { name: 'C', status: 'watching', currency: 'USD' });
    c.lines.push(newLine('pledge', '', 999));
    setStatus(c, 'backed', '2026-03-01');
    setStatus(c, 'refunded', '2026-04-01');
    const old = newProject(d, { name: 'Old', status: 'watching', currency: 'USD' });
    old.lines.push(newLine('pledge', '', 10));
    setStatus(old, 'backed', '2025-03-01');
    d.projects.push(a, b, c, old);
    const s = stats(d, 2026);
    expect(s.backed).toBe(2);
    expect(s.money).toEqual({ USD: { total: 100, paid: 0, owed: 100 }, EUR: { total: 50, paid: 50, owed: 0 } });
    expect(stats(d, 0).money.USD.total).toBe(110);
  });
});

describe('sharing and backups', () => {
  it('round-trips a share code without money or notes', () => {
    const d = newData();
    const p = newProject(d, { name: 'Sky Forge', creator: 'Acme', platform: 'kickstarter', url: 'https://kickstarter.com/projects/a/sky', endAt: '2026-12-01T10:00', notes: 'secret', category: 'minis' });
    p.lines.push(newLine('pledge', '', 200));
    const code = encodeShare({ v: 1, from: 'Sam', items: [shareProject(d, p)] });
    expect(code).not.toContain('secret');
    const s = decodeShare(`hey look\n${code}\n`)!;
    expect(s.from).toBe('Sam');
    const other = newData();
    other.settings.categories = [];
    const q = projectFromShare(other, s.items[0], s.from);
    expect(q).toMatchObject({ name: 'Sky Forge', creator: 'Acme', status: 'watching', endAt: '2026-12-01T10:00', notes: 'Shared by Sam', lines: [] });
    expect(other.settings.categories[0].name).toBe('Miniatures');
    other.projects.push(q);
    expect(findSame(other, { n: 'whatever', u: 'http://www.kickstarter.com/projects/a/sky/' })).toBe(q);
    expect(decodeShare('MBT:!!!')).toBeUndefined();
  });

  it('round-trips a backup and repairs junk', () => {
    const d = newData();
    d.projects.push(newProject(d, { name: 'A' }));
    const back = parseBackup(backupJson(d));
    expect(back.projects[0].name).toBe('A');
    expect(() => parseBackup('{"app":"other"}')).toThrow();
    const n = normalize({ projects: [{ name: '', status: 'nope', lines: [{ amount: 'x' }] }] });
    expect(n.projects[0]).toMatchObject({ name: 'Untitled project', status: 'watching', lines: [{ kind: 'other', amount: 0 }] });
  });

  it('writes a calendar file with an alarm', () => {
    const d = newData();
    const p = newProject(d, { name: 'Big; Game, Deluxe', status: 'watching', endAt: '2026-12-01T10:00', url: 'https://kickstarter.com/projects/a/b' });
    d.projects.push(p);
    const ics = icsFor(upcoming(d, at('2026-11-01T00:00')), 48, at('2026-11-01T00:00'));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Campaign ends: Big\\; Game\\, Deluxe');
    expect(ics).toContain('TRIGGER:-PT48H');
    expect(ics).toContain(`DTEND:${new Date(at('2026-12-01T10:00')).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`);
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });
});
