<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import Icon from './components/Icon.svelte';
  import { requestPersistence } from './lib/db';
  import { checkReminders } from './lib/reminders';
  import { app, dismissToast, isStandalone, router, toast, toasts } from './lib/store.svelte';
  import { setThemeMode } from './lib/theme';
  import Home from './views/Home.svelte';
  import Install from './views/Install.svelte';
  import Money from './views/Money.svelte';
  import ProjectPage from './views/ProjectPage.svelte';
  import Projects from './views/Projects.svelte';
  import Settings from './views/Settings.svelte';

  let updateReady = $state(false);
  let offlineReady = $state(false);
  const updateSW = registerSW({
    onNeedRefresh: () => (updateReady = true),
    onOfflineReady() {
      offlineReady = true;
      if (isStandalone) toast('✓ Ready to use offline', undefined, 4000);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.active) offlineReady = true;
      // Check for a new version hourly while the app stays open. Failures (no signal) are harmless.
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
  requestPersistence();

  $effect(() => setThemeMode(app.d.settings.theme));

  // Reminders: on open, whenever the app comes back to the front, and every few minutes while it's open.
  setTimeout(() => checkReminders(), 2000);
  setInterval(() => document.visibilityState === 'visible' && checkReminders(), 5 * 60_000);
  addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkReminders());

  const r = $derived(router.route);
  const TABS = [
    { page: 'home', href: '#/', ico: 'home', label: 'Home' },
    { page: 'projects', href: '#/projects', ico: 'box', label: 'Projects' },
    { page: 'money', href: '#/money', ico: 'coins', label: 'Stats' },
    { page: 'settings', href: '#/settings', ico: 'settings', label: 'Settings' },
  ] as const;
  const showTabs = $derived(TABS.some((t) => t.page === r.page));
</script>

{#if r.page === 'project'}
  {#key r.arg}<ProjectPage id={r.arg ?? ''} />{/key}
{:else if r.page === 'projects'}
  <Projects />
{:else if r.page === 'money'}
  <Money />
{:else if r.page === 'settings'}
  <Settings {offlineReady} />
{:else if r.page === 'install'}
  <Install />
{:else}
  <Home />
{/if}

{#if updateReady}
  <div class="update" role="status">
    <span>✨ A new version is ready.</span>
    <button class="btn small primary" onclick={() => updateSW(true)}>Update</button>
    <button class="btn small ghost" onclick={() => (updateReady = false)}>Later</button>
  </div>
{/if}

{#if showTabs}
  <nav class="tabbar">
    {#each TABS as t (t.page)}
      <a href={t.href} class:active={r.page === t.page} aria-current={r.page === t.page ? 'page' : undefined}>
        <Icon name={t.ico} size={25} />{t.label}
      </a>
    {/each}
  </nav>
{/if}

<div class="toasts" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast">
      <span>{t.text}</span>
      {#if t.action}
        <button onclick={() => (t.action!.run(), dismissToast(t.id))}>{t.action.label}</button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .update {
    position: fixed;
    left: 12px;
    right: 12px;
    top: calc(66px + env(safe-area-inset-top));
    z-index: 40;
    max-width: 616px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 8px 24px rgb(0 0 0 / 25%);
    font-weight: 800;
  }
  .update span {
    flex: 1;
  }
</style>
