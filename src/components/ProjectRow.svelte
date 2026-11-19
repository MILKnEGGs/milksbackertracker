<script lang="ts">
  import type { Snippet } from 'svelte';
  import { categoryOf, platformName } from '../lib/data';
  import { app } from '../lib/store.svelte';
  import type { Project } from '../lib/types';
  import StagePill from './StagePill.svelte';
  import Thumb from './Thumb.svelte';
  import Track from './Track.svelte';

  // One project in a list. `right` shows a countdown or badge; `below` adds a line of detail.
  let { p, right, below }: { p: Project; right?: Snippet; below?: Snippet } = $props();
</script>

<a class="prow" href="#/p/{p.id}">
  <Thumb {p} />
  <span class="prow-text">
    <strong class="prow-name">{p.name}</strong>
    <span class="prow-meta">
      <StagePill status={p.status} small />
      <span class="muted">{p.creator || categoryOf(app.d, p.category).name}{p.platform !== 'other' ? ` · ${platformName(p.platform)}` : ''}</span>
    </span>
    {#if below}<span class="prow-below">{@render below()}</span>{/if}
    <Track status={p.status} />
  </span>
  {#if right}<span class="prow-right">{@render right()}</span>{/if}
</a>
