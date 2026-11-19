<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import PasteSheet from '../components/PasteSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { backupJson, CURRENCIES, move, newData, parseBackup, uid, upcoming } from '../lib/data';
  import { fileStamp, shareFile } from '../lib/files';
  import { addToCalendar, canNotify, turnOnNotifications } from '../lib/reminders';
  import { sortable } from '../lib/sortable';
  import { app, isStandalone, replaceData, save, toast } from '../lib/store.svelte';
  import type { Category, ThemeMode } from '../lib/types';

  let { offlineReady }: { offlineReady: boolean } = $props();

  let fileInput: HTMLInputElement;
  let pasting = $state(false);
  let newCat = $state('');
  let newEmoji = $state('');
  const blocked = $derived(canNotify() && Notification.permission === 'denied');
  const future = $derived(upcoming(app.d).filter((x) => !x.project.muted));

  const WARN = [
    { h: 24, label: '1 day' },
    { h: 48, label: '2 days' },
    { h: 72, label: '3 days' },
    { h: 168, label: '1 week' },
  ];

  const uses = (id: string) => app.d.projects.filter((p) => p.category === id).length;

  function setTheme(t: ThemeMode) {
    app.d.settings.theme = t;
    save();
  }

  async function toggleNotify() {
    if (app.d.settings.notify) {
      app.d.settings.notify = false;
      save();
      return;
    }
    if (!(await turnOnNotifications())) toast(blocked ? 'Notifications are blocked for this app in your phone settings' : 'Notifications not allowed');
    else toast('🔔 Reminders on');
  }

  function addCat() {
    const n = newCat.trim();
    if (!n) return;
    if (!app.d.settings.categories.some((c) => c.name.toLowerCase() === n.toLowerCase()))
      app.d.settings.categories.push({ id: uid(6), name: n, emoji: newEmoji.trim() || '📦' });
    newCat = newEmoji = '';
    save();
  }

  function editCat(c: Category) {
    const n = prompt('Category name', c.name)?.trim();
    if (!n) return;
    const e = prompt('Emoji', c.emoji)?.trim();
    c.name = n;
    if (e) c.emoji = e;
    save();
  }

  function removeCat(c: Category) {
    const n = uses(c.id);
    if (n && !confirm(`Remove “${c.name}”? ${n} project${n === 1 ? '' : 's'} will move to Other.`)) return;
    app.d.settings.categories = app.d.settings.categories.filter((x) => x.id !== c.id);
    for (const p of app.d.projects) if (p.category === c.id) p.category = 'other';
    if (!app.d.settings.categories.some((x) => x.id === 'other')) app.d.settings.categories.push({ id: 'other', name: 'Other', emoji: '📦' });
    save();
  }

  async function exportBackup() {
    const file = new File([backupJson($state.snapshot(app.d))], `backertracker-backup-${fileStamp()}.json`, { type: 'application/json' });
    await shareFile(file, "Milk's Backer Tracker backup");
  }

  async function importBackup(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const d = parseBackup(await file.text());
      if (!confirm(`Replace everything on this device with this backup?\n\n${d.projects.length} projects.\n\nWhat's here now will be replaced.`)) return;
      await replaceData(d);
      toast('Backup restored ✓');
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function eraseAll() {
    const typed = prompt("Erase EVERYTHING on this device: every project, pledge and date? This can't be undone.\n\nType ERASE to confirm.");
    if (typed?.trim().toUpperCase() !== 'ERASE') return;
    const fresh = newData();
    fresh.settings = { ...$state.snapshot(app.d.settings) };
    await replaceData(fresh);
    toast('Everything erased. Fresh launch pad! 🚀');
  }
</script>

<TopBar title="Settings" />

<main class="page stack" style="gap:16px">
  <section class="card stack">
    <h3>🔔 Reminders</h3>
    <p class="muted small" style="margin:0">Kept light: only campaigns you're <em>watching</em> that are about to end or launch, and pledge managers about to lock.</p>
    <div class="field">
      <span>Warn me</span>
      <div class="seg">
        {#each WARN as w (w.h)}
          <button class:on={app.d.settings.warnHours === w.h} onclick={() => ((app.d.settings.warnHours = w.h), save())}>{w.label} before</button>
        {/each}
      </div>
    </div>
    <div class="remind-opt">
      <span>
        <strong>📅 Calendar alerts</strong>
        <span class="muted small">The reliable one: works even with the app closed. Use the calendar button on any countdown, or add them all here.</span>
      </span>
      <button class="btn small" disabled={!future.length} onclick={() => addToCalendar(future, 'Backer deadlines')}>
        <Icon name="calendar" size={16} /> Add {future.length || ''}
      </button>
    </div>
    {#if canNotify()}
      <div class="remind-opt">
        <span>
          <strong>📳 Phone notifications</strong>
          <span class="muted small">One ping per deadline. Phones only let offline apps notify while they're open or the next time you open them.{isStandalone ? '' : ' On iPhone, install the app first.'}</span>
        </span>
        <button class="switch" role="switch" aria-checked={app.d.settings.notify} aria-label="Phone notifications" onclick={toggleNotify}><span></span></button>
      </div>
      {#if blocked}<p class="small warn-text" style="margin:0">Notifications are blocked for this app. Allow them in your phone's settings first.</p>{/if}
    {/if}
    <p class="muted small" style="margin:0">Mute one project from its ⋯ menu. The Home Screen icon also shows a badge for deadlines inside the warning window, where the phone supports it.</p>
  </section>

  <section class="card stack">
    <h3>💱 Money</h3>
    <label class="field">
      <span>Usual currency for new projects</span>
      <select class="input" bind:value={app.d.settings.currency} onchange={save}>
        {#each CURRENCIES as c (c)}<option value={c}>{c}</option>{/each}
      </select>
    </label>
  </section>

  <section class="card stack">
    <h3>🗂️ Categories</h3>
    <p class="muted small" style="margin:0">Tap to rename. Drag to reorder.</p>
    <div class="rows tight" use:sortable={{ onmove: (a, b) => (move(app.d.settings.categories, a, b), save()) }}>
      {#each app.d.settings.categories as c (c.id)}
        <div data-sort class="svc-row">
          <button class="svc-name" onclick={() => editCat(c)}>{c.emoji} {c.name} <span class="muted small">{uses(c.id) || ''}</span></button>
          <button class="remove-btn" aria-label="Remove {c.name}" onclick={() => removeCat(c)}><Icon name="x" size={18} /></button>
          <span class="handle" data-handle aria-label="Drag to reorder"><Icon name="grip" /></span>
        </div>
      {/each}
    </div>
    <form class="row" style="flex-wrap:nowrap" onsubmit={(e) => (e.preventDefault(), addCat())}>
      <input class="input" style="width:64px;flex:none;text-align:center" bind:value={newEmoji} placeholder="🎁" aria-label="Emoji" />
      <input class="input" bind:value={newCat} placeholder="Add a category" />
      <button class="btn primary" disabled={!newCat.trim()}>Add</button>
    </form>
  </section>

  <section class="card stack">
    <h3>💌 Sharing</h3>
    <label class="field">
      <span>Your name on shared projects</span>
      <input class="input" bind:value={app.d.settings.name} oninput={save} placeholder="Optional" />
    </label>
    <button class="btn" onclick={() => (pasting = true)}>📋 Paste a shared project</button>
  </section>

  <section class="card stack">
    <h3>🎨 Look</h3>
    <div class="seg">
      <button class:on={app.d.settings.theme === 'dark'} onclick={() => setTheme('dark')}>🌌 Launch night</button>
      <button class:on={app.d.settings.theme === 'light'} onclick={() => setTheme('light')}>☀️ Light</button>
      <button class:on={app.d.settings.theme === 'auto'} onclick={() => setTheme('auto')}>Match device</button>
    </div>
  </section>

  <section class="card stack">
    <h3>💾 Backup & move to another device</h3>
    <p class="muted small" style="margin:0">
      Everything is saved only on this device. Export a backup to keep a copy or move to a new phone, then <em>Import</em> it there. Importing
      <strong>replaces</strong> what's on that device.
    </p>
    <div class="row">
      <button class="btn primary" onclick={exportBackup}>⬆️ Export backup</button>
      <button class="btn" onclick={() => fileInput.click()}>⬇️ Import backup</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importBackup} />
    </div>
  </section>

  <section class="card stack">
    <h3>📲 Install on your phone</h3>
    <p class="muted small" style="margin:0">
      {#if isStandalone}
        ✓ You're using the installed app{offlineReady ? ' and it works offline' : ''}.
      {:else}
        Add the app to your Home Screen so it opens like an app and works with no signal.
      {/if}
    </p>
    <a class="btn" href="#/install">How to install</a>
  </section>

  <section class="card stack">
    <h3>Danger zone</h3>
    <button class="btn danger" onclick={eraseAll}>Erase everything on this device</button>
  </section>

  <p class="muted small center">
    Milk's Backer Tracker v{__APP_VERSION__} · made with 🚀 · <a href="https://milkneggs.github.io/pitch/milksbackertracker.html" target="_blank" rel="noopener">See what it does</a>
  </p>
</main>

{#if pasting}<PasteSheet onclose={() => (pasting = false)} />{/if}
