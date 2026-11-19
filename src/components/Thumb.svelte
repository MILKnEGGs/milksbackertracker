<script lang="ts">
  import { categoryOf, isOutcome } from '../lib/data';
  import { app } from '../lib/store.svelte';
  import type { Project } from '../lib/types';

  let { p, size = 52 }: { p: Project; size?: number } = $props();
</script>

{#if p.image}
  <img class="thumb" src={p.image} alt="" width={size} height={size} style="width:{size}px;height:{size}px" />
{:else}
  <span class="thumb emoji" style="width:{size}px;height:{size}px;font-size:{size * 0.5}px;--c: var(--s-{isOutcome(p.status) ? 'closed' : p.status})">
    {categoryOf(app.d, p.category).emoji}
  </span>
{/if}
