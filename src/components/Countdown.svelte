<script lang="ts">
  import { countdown, urgency } from '../lib/data';
  import { clock } from '../lib/store.svelte';

  let { at, big = false }: { at: number; big?: boolean } = $props();
  const left = $derived(at - clock.now);
</script>

<span class="countdown {urgency(left)}" class:big>{left > 0 ? countdown(left) : 'Ended'}</span>
