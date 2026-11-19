<script lang="ts">
  import AddSheet from '../components/AddSheet.svelte';
  import Countdown from '../components/Countdown.svelte';
  import Icon from '../components/Icon.svelte';
  import ProjectRow from '../components/ProjectRow.svelte';
  import ShareSheet from '../components/ShareSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { allTags, deadlinesOf, DEADLINE_LABEL, GROUPS, inGroup, lateLabel, money, monthLabel, monthsLate, search, SORTS, sortProjects, totals } from '../lib/data';
  import { app, clock, listView as v } from '../lib/store.svelte';

  let adding = $state(false);
  let sharing = $state(false);
  let searching = $state(!!v.q);

  const minute = $derived(Math.floor(clock.now / 60_000) * 60_000);
  const tags = $derived(allTags(app.d));
  const usedCats = $derived(app.d.settings.categories.filter((c) => app.d.projects.some((p) => p.category === c.id)));
  const shown = $derived(
    sortProjects(
      search(
        app.d.projects.filter((p) => inGroup(p, v.group) && (!v.category || p.category === v.category) && (!v.tag || p.tags.includes(v.tag))),
        v.q,
      ),
      v.sort,
      minute,
    ),
  );
  const count = (g: (typeof GROUPS)[number]['id']) => app.d.projects.filter((p) => inGroup(p, g)).length;

  /** The next date that matters, for the right side of a row. */
  const nextOf = (p: (typeof shown)[number]) => deadlinesOf(p).find((x) => x.at > minute);
</script>

<TopBar title="Projects" sub="{shown.length} of {app.d.projects.length}">
  <button class="icon-btn" aria-label="Search" onclick={() => ((searching = !searching), searching || (v.q = ''))}><Icon name="search" /></button>
  {#if shown.length}<button class="icon-btn" aria-label="Share these" onclick={() => (sharing = true)}><Icon name="share" /></button>{/if}
</TopBar>

<main class="page stack">
  {#if searching}
    <!-- svelte-ignore a11y_autofocus -->
    <input class="input" type="search" bind:value={v.q} placeholder="Search names, creators, tags, add-ons…" autofocus />
  {/if}

  <div class="chips scroll">
    {#each GROUPS as g (g.id)}
      <button class="chip" class:on={v.group === g.id} onclick={() => (v.group = g.id)}>{g.label} <span class="count">{count(g.id)}</span></button>
    {/each}
  </div>

  {#if usedCats.length > 1 || tags.length}
    <div class="chips scroll">
      {#each usedCats as c (c.id)}
        <button class="chip small-chip" class:on={v.category === c.id} onclick={() => (v.category = v.category === c.id ? '' : c.id)}>{c.emoji} {c.name}</button>
      {/each}
      {#each tags as t (t)}
        <button class="chip small-chip" class:on={v.tag === t} onclick={() => (v.tag = v.tag === t ? '' : t)}>#{t}</button>
      {/each}
    </div>
  {/if}

  <label class="sort-line">
    <Icon name="more" size={16} />
    <span class="muted small">Sort by</span>
    <select bind:value={v.sort}>
      {#each SORTS as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
    </select>
  </label>

  {#if shown.length}
    <div class="rows card flush">
      {#each shown as p (p.id)}
        {@const next = nextOf(p)}
        {@const late = monthsLate(p, minute)}
        {@const t = totals(p)}
        <ProjectRow {p}>
          {#snippet below()}
            {#if next}<span class="muted small">{DEADLINE_LABEL[next.kind]}</span>
            {:else if p.estDelivery && p.status !== 'delivered'}<span class="muted small">Expected {monthLabel(p.estDelivery)}</span>{/if}
            {#if t.total}<span class="muted small">{money(t.total, p.currency)}</span>{/if}
            {#if late && p.status !== 'delivered'}<span class="late-badge small">{lateLabel(late)}</span>{/if}
          {/snippet}
          {#snippet right()}
            {#if next}<Countdown at={next.at} />{/if}
          {/snippet}
        </ProjectRow>
      {/each}
    </div>
  {:else}
    <div class="empty">
      <span class="big-emoji">🔭</span>
      <p class="muted">{app.d.projects.length ? 'Nothing matches these filters.' : 'No projects yet.'}</p>
      {#if app.d.projects.length}
        <button class="btn" onclick={() => ((v.group = ''), (v.category = ''), (v.tag = ''), (v.q = ''))}>Show everything</button>
      {:else}
        <button class="btn primary" onclick={() => (adding = true)}>+ Add a project</button>
      {/if}
    </div>
  {/if}
</main>

<button class="fab" onclick={() => (adding = true)}>+ Add</button>

{#if adding}<AddSheet onclose={() => (adding = false)} />{/if}
{#if sharing}<ShareSheet projects={shown} onclose={() => (sharing = false)} />{/if}
