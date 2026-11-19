<script lang="ts">
  import { CURRENCIES, newLine, newProject, parseLink, PLATFORMS, setEstimate, STAGES, stageIndex } from '../lib/data';
  import { app, go, save, toast } from '../lib/store.svelte';
  import type { Stage } from '../lib/types';
  import Sheet from './Sheet.svelte';
  import WhenField from './WhenField.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let link = $state('');
  let name = $state('');
  let creator = $state('');
  let platform = $state('kickstarter');
  let status = $state<Stage>('watching');
  let launchAt = $state('');
  let endAt = $state('');
  let notLaunched = $state(false);
  let amount = $state<number | undefined>();
  let currency = $state(app.d.settings.currency);
  let category = $state(app.d.settings.categories[0]?.id ?? 'other');
  let est = $state('');
  // Fill the name and creator from the link unless they've been typed by hand.
  let autoName = '';
  let autoCreator = '';

  const i = $derived(stageIndex(status));

  function readLink() {
    const info = parseLink(link);
    if (!info) return;
    platform = info.platform;
    if (info.name && (!name || name === autoName)) name = autoName = info.name;
    if (info.creator && (!creator || creator === autoCreator)) creator = autoCreator = info.creator;
  }

  async function pasteLink() {
    try {
      link = await navigator.clipboard.readText();
      readLink();
    } catch {
      toast('Long-press the box and tap Paste.');
    }
  }

  function add(e: Event) {
    e.preventDefault();
    if (!name.trim()) return;
    const p = newProject(app.d, {
      name: name.trim(),
      creator: creator.trim(),
      platform,
      url: parseLink(link)?.url ?? '',
      status,
      category,
      currency,
      launchAt: status === 'watching' && notLaunched ? launchAt : '',
      endAt: i <= 1 ? endAt : '',
    });
    if (i >= 1 && amount) p.lines.push({ ...newLine('pledge', 'Pledge', amount), paid: i >= 2 });
    if (i >= 1 && est) setEstimate(p, est);
    app.d.projects.push(p);
    save();
    onclose();
    toast(`Added “${p.name}” ✓`);
    go('p/' + p.id);
  }
</script>

<Sheet {onclose} label="Add a project" full>
  <form class="stack" onsubmit={add}>
    <h2>🚀 Add a project</h2>

    <label class="field">
      <span>Campaign link <small class="muted">(optional)</small></span>
      <span class="row" style="flex-wrap:nowrap">
        <input class="input" type="url" inputmode="url" bind:value={link} oninput={readLink} placeholder="kickstarter.com/projects/…" />
        <button type="button" class="btn" onclick={pasteLink}>Paste</button>
      </span>
    </label>

    <label class="field">
      <span>Name</span>
      <input class="input" bind:value={name} placeholder="Sky Forge: Second Printing" required />
    </label>

    <div class="grid2">
      <label class="field">
        <span>Creator</span>
        <input class="input" bind:value={creator} placeholder="Optional" />
      </label>
      <label class="field">
        <span>Platform</span>
        <select class="input" bind:value={platform}>
          {#each PLATFORMS as pl (pl.id)}<option value={pl.id}>{pl.name}</option>{/each}
        </select>
      </label>
    </div>

    <div class="field">
      <span>Where is it at?</span>
      <div class="chips scroll">
        {#each STAGES as s (s.id)}
          <button type="button" class="chip stage-chip" class:on={status === s.id} style="--c: var(--s-{s.id})" onclick={() => (status = s.id as Stage)}
            >{s.emoji} {s.short}</button
          >
        {/each}
      </div>
    </div>

    {#if status === 'watching'}
      <label class="toggle">
        <input type="checkbox" bind:checked={notLaunched} />
        <span>Hasn't launched yet</span>
      </label>
      {#if notLaunched}
        <WhenField label="Launches" bind:value={launchAt} />
      {/if}
    {/if}
    {#if i <= 1}
      <WhenField label="Campaign ends" bind:value={endAt} hint="Shows a countdown on Home." />
    {/if}

    {#if i >= 1}
      <div class="grid2">
        <label class="field">
          <span>Pledged</span>
          <input class="input" type="number" inputmode="decimal" min="0" step="0.01" bind:value={amount} placeholder="0.00" />
        </label>
        <label class="field">
          <span>Currency</span>
          <select class="input" bind:value={currency}>
            {#each CURRENCIES as c (c)}<option value={c}>{c}</option>{/each}
          </select>
        </label>
      </div>
      <label class="field">
        <span>Estimated delivery</span>
        <input class="input" type="month" bind:value={est} />
      </label>
    {/if}

    <div class="field">
      <span>Category</span>
      <div class="chips">
        {#each app.d.settings.categories as c (c.id)}
          <button type="button" class="chip small-chip" class:on={category === c.id} onclick={() => (category = c.id)}>{c.emoji} {c.name}</button>
        {/each}
      </div>
    </div>

    <button class="btn primary block" disabled={!name.trim()}>Add project</button>
    <p class="muted small center" style="margin:0">Everything else (add-ons, pledge manager, tracking) is on the project page.</p>
  </form>
</Sheet>
