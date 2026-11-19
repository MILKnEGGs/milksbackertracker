<script lang="ts">
  import { isOutcome, statusInfo } from '../lib/data';
  import type { Status } from '../lib/types';

  let { status, small = false }: { status: Status; small?: boolean } = $props();
  const info = $derived(statusInfo(status));
</script>

<span class="pill" class:small style="--c: var(--s-{isOutcome(status) ? 'closed' : status})">{info.emoji} {info.short}</span>
