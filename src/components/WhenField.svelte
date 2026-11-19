<script lang="ts">
  // A date + time picker with a clear button. Times are the phone's local time.
  let { label, value = $bindable(''), onchange, hint }: { label: string; value: string; onchange?: () => void; hint?: string } = $props();
</script>

<label class="field">
  <span>{label}</span>
  <span class="row" style="flex-wrap:nowrap">
    <input class="input" type="datetime-local" bind:value onchange={() => onchange?.()} />
    {#if value}
      <button type="button" class="btn ghost small" aria-label="Clear {label}" onclick={() => ((value = ''), onchange?.())}>✕</button>
    {/if}
  </span>
  {#if hint}<small class="muted">{hint}</small>{/if}
</label>
