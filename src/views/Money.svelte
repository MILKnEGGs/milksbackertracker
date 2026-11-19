<script lang="ts">
  import ProjectRow from '../components/ProjectRow.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { categoryOf, lateLabel, money, monthLabel, monthsLate, platformName, runningLate, stats, totals, years, isActive } from '../lib/data';
  import { app, clock } from '../lib/store.svelte';

  let year = $state(new Date().getFullYear());
  const minute = $derived(Math.floor(clock.now / 60_000) * 60_000);
  const ys = $derived(years(app.d));
  const s = $derived(stats(app.d, year, minute));
  const currencies = $derived(Object.keys(s.money).sort((a, b) => (a === app.d.settings.currency ? -1 : b === app.d.settings.currency ? 1 : a.localeCompare(b))));
  const late = $derived(runningLate(app.d, minute));
  // Money still to pay across everything active, whatever year it was backed.
  const owing = $derived(app.d.projects.filter((p) => isActive(p.status) && totals(p).owed > 0));
  const maxCat = $derived(Math.max(1, ...s.byCategory.map((c) => c.count)));
</script>

<TopBar title="Stats" sub="Money, lateness and totals" />

<main class="page stack" style="gap:18px">
  <div class="chips scroll">
    {#each ys as y (y)}<button class="chip" class:on={year === y} onclick={() => (year = y)}>{y}</button>{/each}
    <button class="chip" class:on={year === 0} onclick={() => (year = 0)}>All time</button>
  </div>

  <div class="tiles three">
    <div class="tile" style="--c: var(--s-backed)"><strong>{s.backed}</strong><span>Backed</span></div>
    <div class="tile" style="--c: var(--s-delivered)"><strong>{s.delivered}</strong><span>Delivered</span></div>
    <div class="tile" style="--c: var(--red)">
      <strong>{s.avgLate == null ? '–' : s.avgLate < 0.5 ? '0' : s.avgLate.toFixed(1)}</strong><span>Avg months late</span>
    </div>
  </div>

  <section class="card stack">
    <h3>💰 {year ? `Backed in ${year}` : 'All time'}</h3>
    {#if currencies.length}
      {#each currencies as c (c)}
        {@const m = s.money[c]}
        <div class="totals">
          <span><span class="muted small">Pledged{currencies.length > 1 ? ` (${c})` : ''}</span><strong>{money(m.total, c)}</strong></span>
          <span><span class="muted small">Paid</span><strong>{money(m.paid, c)}</strong></span>
          <span class:owe={m.owed > 0}><span class="muted small">Still to pay</span><strong>{money(m.owed, c)}</strong></span>
        </div>
      {/each}
      <p class="muted small" style="margin:0">Refunded, cancelled and unfunded projects don't count. Currencies are kept apart (no exchange rates offline).</p>
    {:else}
      <p class="muted small" style="margin:0">Nothing backed {year ? `in ${year}` : 'yet'}. Amounts come from each project's Pledge card.</p>
    {/if}
  </section>

  {#if s.byCategory.length}
    <section class="card stack tight">
      <h3>🗂️ By category</h3>
      {#each s.byCategory as c (c.id)}
        {@const cat = categoryOf(app.d, c.id)}
        <div class="bar-row">
          <span class="bar-label">{cat.emoji} {cat.name}</span>
          <span class="bar"><span style="width:{(c.count / maxCat) * 100}%"></span></span>
          <span class="bar-val">{c.count}</span>
          <span class="muted small bar-money">{Object.entries(c.money).filter(([, v]) => v).map(([cur, v]) => money(v, cur)).join(' + ')}</span>
        </div>
      {/each}
    </section>

    <section class="card stack tight">
      <h3>🌐 By platform</h3>
      <div class="chips">
        {#each s.byPlatform as pl (pl.id)}<span class="chip small-chip static">{platformName(pl.id)} <span class="count">{pl.count}</span></span>{/each}
      </div>
    </section>
  {/if}

  {#if owing.length}
    <section class="stack tight">
      <h3>🧾 Still to pay</h3>
      <div class="rows card flush">
        {#each owing as p (p.id)}
          <ProjectRow {p}>
            {#snippet right()}<strong class="owe">{money(totals(p).owed, p.currency)}</strong>{/snippet}
          </ProjectRow>
        {/each}
      </div>
    </section>
  {/if}

  {#if late.length}
    <section class="stack tight">
      <h3>🐢 Late and not here yet</h3>
      <div class="rows card flush">
        {#each late as p (p.id)}
          <ProjectRow {p}>
            {#snippet below()}<span class="muted small">Was due {monthLabel(p.origDelivery || p.estDelivery)}</span>{/snippet}
            {#snippet right()}<span class="late-badge">{lateLabel(monthsLate(p, minute))}</span>{/snippet}
          </ProjectRow>
        {/each}
      </div>
    </section>
  {/if}
</main>
