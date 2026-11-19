<script lang="ts">
  import { copyText } from '../lib/actions';
  import { shareProject, shareText, type Share } from '../lib/data';
  import { app, save, toast } from '../lib/store.svelte';
  import type { Project } from '../lib/types';
  import Sheet from './Sheet.svelte';

  // Share projects as readable text plus an MBT: code. Money, notes and pictures stay private.
  let { onclose, projects }: { onclose: () => void; projects: Project[] } = $props();

  let note = $state('');
  let withTier = $state(false);
  const hasTier = $derived(projects.some((p) => p.tier));

  const share = $derived<Share>({
    v: 1,
    from: app.d.settings.name.trim() || undefined,
    items: projects.map((p, i) => ({ ...shareProject(app.d, p, withTier), m: i === 0 && projects.length === 1 && note.trim() ? note.trim() : undefined })),
  });
  const message = $derived(shareText(share));

  async function copy() {
    if (await copyText(message)) {
      toast('Copied ✓ Paste it into a text or email');
      onclose();
    } else toast("Couldn't copy. Long-press the text and copy it.");
  }

  async function send() {
    try {
      await navigator.share({ text: message });
      onclose();
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') copy();
    }
  }
</script>

<Sheet {onclose} label="Share" full>
  <div class="stack">
    <h2>{projects.length === 1 ? `Share “${projects[0].name}”` : `Share ${projects.length} projects`}</h2>
    {#if projects.length === 1}
      <label class="field">
        <span>Add a note</span>
        <input class="input" bind:value={note} placeholder="The all-in is a steal!" />
      </label>
    {/if}
    {#if hasTier}
      <label class="toggle">
        <input type="checkbox" bind:checked={withTier} />
        <span>Include my pledge tier</span>
      </label>
    {/if}
    <label class="field">
      <span>Your name on it</span>
      <input class="input" bind:value={app.d.settings.name} oninput={save} placeholder="Optional" />
    </label>
    <pre class="share-preview">{message}</pre>
    <div class="row">
      <button class="btn primary" style="flex:1" onclick={copy}>📋 Copy message</button>
      {#if 'share' in navigator}<button class="btn" onclick={send}>Share…</button>{/if}
    </div>
    <p class="muted small" style="margin:0">
      They copy the whole message and tap <strong>Paste a shared project</strong> in their Backer Tracker. Without the app they still get the names and links.
      Your money, notes and pictures aren't included.
    </p>
  </div>
</Sheet>
