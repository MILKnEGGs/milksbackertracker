<script lang="ts">
  import { decodeShare, findSame, platformName, projectFromShare, whenLabel, type Share } from '../lib/data';
  import { app, go, save, toast } from '../lib/store.svelte';
  import Sheet from './Sheet.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let text = $state('');
  let share = $state<Share>();
  let checked = $state<boolean[]>([]);

  async function fromClipboard() {
    try {
      text = await navigator.clipboard.readText();
      read();
    } catch {
      toast('Long-press the box and tap Paste.');
    }
  }

  function read() {
    share = decodeShare(text);
    if (share) checked = share.items.map((si) => !findSame(app.d, si));
  }

  function add() {
    if (!share) return;
    const ids: string[] = [];
    share.items.forEach((si, i) => {
      if (!checked[i] || findSame(app.d, si)) return;
      const p = projectFromShare(app.d, si, share!.from);
      app.d.projects.push(p);
      ids.push(p.id);
    });
    save();
    onclose();
    toast(ids.length ? `Added ${ids.length} to Watching ✓` : 'You already have all of these');
    if (ids.length === 1) go('p/' + ids[0]);
    else if (ids.length) go('projects');
  }
</script>

<Sheet {onclose} label="Paste a shared project" full>
  <div class="stack">
    <h2>📋 Paste a shared project</h2>
    {#if !share}
      <p class="muted small" style="margin:0">Someone sent you a project from Milk's Backer Tracker? Copy their <strong>whole message</strong> and paste it here.</p>
      <button class="btn primary block" onclick={fromClipboard}>📋 Paste from clipboard</button>
      <textarea class="input" rows="5" placeholder="…or paste here (the part starting with MBT:)" bind:value={text} oninput={read}></textarea>
      {#if text.trim() && !share}
        <p class="muted small">That doesn't have a Backer Tracker code in it. Make sure the part starting with <strong>MBT:</strong> got copied too.</p>
      {/if}
    {:else}
      <p style="margin:0">
        {share.items.length} project{share.items.length === 1 ? '' : 's'}
        {#if share.from}from <strong>{share.from}</strong>{/if}
      </p>
      <div class="rows">
        {#each share.items as si, i (i)}
          {@const same = findSame(app.d, si)}
          <label class="result" class:faded={!!same}>
            <input type="checkbox" bind:checked={checked[i]} disabled={!!same} />
            <span class="thumb emoji" style="width:40px;height:40px;font-size:20px">{si.k?.e ?? '📦'}</span>
            <span class="prow-text">
              <strong class="prow-name">{si.n}</strong>
              <span class="muted small">{[si.c, si.p && platformName(si.p)].filter(Boolean).join(' · ')}</span>
              {#if si.e}<span class="muted small">Ends {whenLabel(si.e)}</span>{/if}
              {#if si.m}<span class="muted small">“{si.m}”</span>{/if}
              {#if same}<span class="muted small">✓ Already in your projects</span>{/if}
            </span>
          </label>
        {/each}
      </div>
      <div class="row">
        <button class="btn primary" style="flex:1" onclick={add} disabled={!checked.some(Boolean)}>Add to Watching</button>
        <button class="btn ghost" onclick={() => ((share = undefined), (text = ''))}>Back</button>
      </div>
    {/if}
  </div>
</Sheet>
