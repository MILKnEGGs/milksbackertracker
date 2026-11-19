<script lang="ts">
  // A thin bar of the 8 stages, filled up to where the project is. Grey when it left the journey.
  import { isOutcome, STAGES, stageIndex } from '../lib/data';
  import type { Status } from '../lib/types';

  let { status }: { status: Status } = $props();
  const at = $derived(stageIndex(status));
</script>

<span class="track" class:closed={isOutcome(status)} aria-hidden="true">
  {#each STAGES as s, i (s.id)}
    <span class="seg" class:on={i <= at} style="--c: var(--s-{s.id})"></span>
  {/each}
</span>
