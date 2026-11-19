<script lang="ts">
  import AddSheet from '../components/AddSheet.svelte';
  import Countdown from '../components/Countdown.svelte';
  import Icon from '../components/Icon.svelte';
  import PasteSheet from '../components/PasteSheet.svelte';
  import ProjectRow from '../components/ProjectRow.svelte';
  import TopBar from '../components/TopBar.svelte';
  import {
    dayLabel,
    isActive,
    lateLabel,
    money,
    monthLabel,
    monthsLate,
    nudges,
    onItsWay,
    runningLate,
    setStatus,
    totals,
    upcoming,
    when,
    whenLabel,
  } from '../lib/data';
  import { addToCalendar } from '../lib/reminders';
  import { app, clock, listView, save, toast } from '../lib/store.svelte';
  import type { Project, Status } from '../lib/types';

  let adding = $state(false);
  let pasting = $state(false);

  // Recomputed once a minute; the countdowns themselves tick every second.
  const minute = $derived(Math.floor(clock.now / 60_000) * 60_000);
  const all = $derived(upcoming(app.d, minute));
  // Not launched yet: it shows under Coming up instead.
  const ending = $derived(all.filter((x) => x.kind === 'end' && !((when(x.project.launchAt) ?? 0) > minute)));
  const later = $derived(all.filter((x) => x.kind === 'launch' || x.kind === 'pmopen'));
  const todo = $derived(nudges(app.d, minute));
  const coming = $derived(onItsWay(app.d));
  const late = $derived(runningLate(app.d, minute));

  const counts = $derived({
    watching: app.d.projects.filter((p) => p.status === 'watching').length,
    active: app.d.projects.filter((p) => isActive(p.status)).length,
    coming: coming.length,
    late: late.length,
  });

  function answer(p: Project, s: Status, msg: string) {
    const paid = setStatus(p, s);
    save();
    toast(paid ? `${msg} Pledge marked paid.` : msg);
  }

  function addAll() {
    const list = ending.filter((x) => !x.project.muted);
    if (list.length) addToCalendar(list, 'Campaigns ending');
  }
</script>

<TopBar title="Backer Tracker" sub={app.d.projects.length ? undefined : 'Kickstarter, Gamefound & friends'}>
  <button class="icon-btn" aria-label="Paste a shared project" onclick={() => (pasting = true)}><Icon name="paste" /></button>
</TopBar>

<main class="page stack" style="gap:18px">
  {#if !app.d.projects.length}
    <div class="card empty">
      <span class="big-emoji">🚀</span>
      <h2>Ready for launch</h2>
      <p class="muted">
        Add the campaigns you're watching and everything you've backed. Countdowns, pledge manager deadlines and “where's my stuff?” all land right here.
      </p>
      <div class="row" style="justify-content:center">
        <button class="btn primary" onclick={() => (adding = true)}>+ Add a project</button>
        <button class="btn" onclick={() => (pasting = true)}>Paste a shared one</button>
      </div>
    </div>
  {:else}
    <div class="tiles">
      <a class="tile" href="#/projects" onclick={() => (listView.group = 'following')} style="--c: var(--s-watching)">
        <strong>{counts.watching}</strong><span>Watching</span>
      </a>
      <a class="tile" href="#/projects" onclick={() => (listView.group = 'active')} style="--c: var(--s-backed)">
        <strong>{counts.active}</strong><span>Backed</span>
      </a>
      <a class="tile" href="#/projects" onclick={() => (listView.group = 'coming')} style="--c: var(--s-boat)">
        <strong>{counts.coming}</strong><span>On its way</span>
      </a>
      <div class="tile" style="--c: var(--red)"><strong>{counts.late}</strong><span>Late</span></div>
    </div>

    <section class="stack tight">
      <div class="sec-head">
        <h3>⏰ Ending soon</h3>
        {#if ending.length}<button class="link-btn" onclick={addAll}><Icon name="calendar" size={16} /> Add to calendar</button>{/if}
      </div>
      {#if ending.length}
        <div class="rows card flush">
          {#each ending as x (x.key)}
            <ProjectRow p={x.project}>
              {#snippet below()}
                <span class="muted small">{whenLabel(x.project.endAt)}</span>
                {#if x.project.status === 'watching'}<span class="tag warn">Not backed yet</span>{/if}
              {/snippet}
              {#snippet right()}<Countdown at={x.at} big />{/snippet}
            </ProjectRow>
          {/each}
        </div>
        {#if !app.d.settings.notify}
          <a class="muted small hint-link" href="#/settings">🔔 Want a heads-up before these end? Turn on reminders</a>
        {/if}
      {:else}
        <p class="muted small none">Nothing live right now. Add an end date to a project you're watching and it counts down here.</p>
      {/if}
    </section>

    {#if todo.length}
      <section class="stack tight">
        <h3>✋ Needs you</h3>
        <div class="rows card flush">
          {#each todo as n (n.project.id + n.kind)}
            {@const p = n.project}
            <ProjectRow {p}>
              {#snippet below()}
                {#if n.kind === 'didback'}
                  <span class="small">Ended {dayLabel(p.endAt.slice(0, 10))}. Did you back it?</span>
                {:else if n.kind === 'didfund'}
                  <span class="small">Campaign ended. Did it fund?</span>
                {:else if n.kind === 'pmlock'}
                  <span class="small">Pledge manager locks {whenLabel(p.pm.locksAt)}</span>
                  {#if !p.pm.surveyDone}<span class="tag warn">Survey</span>{/if}
                  {#if !p.pm.addressDone}<span class="tag warn">Address</span>{/if}
                {:else if n.kind === 'survey'}
                  <span class="small">Pledge manager:</span>
                  {#if !p.pm.surveyDone}<span class="tag warn">Survey not done</span>{/if}
                  {#if !p.pm.addressDone}<span class="tag warn">Address not confirmed</span>{/if}
                {:else if n.kind === 'owed'}
                  <span class="small">Still owe <strong>{money(totals(p).owed, p.currency)}</strong></span>
                {/if}
              {/snippet}
              {#snippet right()}
                {#if n.kind === 'pmlock'}<Countdown at={when(p.pm.locksAt) ?? 0} big />{/if}
              {/snippet}
            </ProjectRow>
            {#if n.kind === 'didback'}
              <div class="row-actions">
                <button class="btn small primary" onclick={() => answer(p, 'backed', 'Marked as backed 🙌')}>🙌 I backed it</button>
                <button class="btn small" onclick={() => answer(p, 'passed', 'Marked as passed')}>Passed</button>
              </div>
            {:else if n.kind === 'didfund'}
              <div class="row-actions">
                <button class="btn small primary" onclick={() => answer(p, 'funded', 'Funded 🎉')}>🎉 Funded</button>
                <button class="btn small" onclick={() => answer(p, 'failed', 'Marked as not funded')}>Not funded</button>
                <button class="btn small ghost" onclick={() => answer(p, 'cancelled', 'Marked as cancelled')}>Cancelled</button>
              </div>
            {/if}
          {/each}
        </div>
      </section>
    {/if}

    {#if later.length}
      <section class="stack tight">
        <h3>📅 Coming up</h3>
        <div class="rows card flush">
          {#each later as x (x.key)}
            <ProjectRow p={x.project}>
              {#snippet below()}
                <span class="muted small">{x.kind === 'launch' ? '🚀 Launches' : '📋 Pledge manager opens'} {whenLabel(x.kind === 'launch' ? x.project.launchAt : x.project.pm.opensAt)}</span>
              {/snippet}
              {#snippet right()}<Countdown at={x.at} />{/snippet}
            </ProjectRow>
          {/each}
        </div>
      </section>
    {/if}

    {#if coming.length}
      <section class="stack tight">
        <h3>🚢 On its way</h3>
        <div class="rows card flush">
          {#each coming as p (p.id)}
            <ProjectRow {p}>
              {#snippet below()}
                {#if p.tracking}<span class="muted small">📦 {p.carrier ? p.carrier + ' ' : ''}{p.tracking}</span>
                {:else if p.estDelivery}<span class="muted small">Expected {monthLabel(p.estDelivery)}</span>{/if}
              {/snippet}
            </ProjectRow>
          {/each}
        </div>
      </section>
    {/if}

    {#if late.length}
      <section class="stack tight">
        <h3>🐢 Running late</h3>
        <div class="rows card flush">
          {#each late.slice(0, 5) as p (p.id)}
            <ProjectRow {p}>
              {#snippet below()}
                <span class="muted small">Was due {monthLabel(p.origDelivery || p.estDelivery)}{p.estDelivery && p.estDelivery !== p.origDelivery ? `, now ${monthLabel(p.estDelivery)}` : ''}</span>
              {/snippet}
              {#snippet right()}<span class="late-badge">{lateLabel(monthsLate(p, minute))}</span>{/snippet}
            </ProjectRow>
          {/each}
        </div>
        {#if late.length > 5}<a class="muted small hint-link" href="#/money">See all {late.length} on the Stats tab</a>{/if}
      </section>
    {/if}
  {/if}
</main>

<button class="fab" onclick={() => (adding = true)}>+ Add</button>

{#if adding}<AddSheet onclose={() => (adding = false)} />{/if}
{#if pasting}<PasteSheet onclose={() => (pasting = false)} />{/if}
