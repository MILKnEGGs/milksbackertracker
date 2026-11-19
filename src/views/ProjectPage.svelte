<script lang="ts">
  import { untrack } from 'svelte';
  import { shrinkImage } from '../lib/actions';
  import Countdown from '../components/Countdown.svelte';
  import Icon from '../components/Icon.svelte';
  import ShareSheet from '../components/ShareSheet.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Thumb from '../components/Thumb.svelte';
  import TopBar from '../components/TopBar.svelte';
  import WhenField from '../components/WhenField.svelte';
  import {
    CURRENCIES,
    dayLabel,
    dayStr,
    deadlinesOf,
    DEADLINE_LABEL,
    duplicate,
    isOutcome,
    lateLabel,
    LINE_KINDS,
    money,
    monthLabel,
    monthsLate,
    monthsPushed,
    newLine,
    OUTCOMES,
    platformName,
    PLATFORMS,
    PM_SERVICES,
    setEstimate,
    setStatus,
    stageIndex,
    STAGES,
    statusInfo,
    totals,
  } from '../lib/data';
  import { addToCalendar } from '../lib/reminders';
  import { app, back, clock, go, projectById, save, toast, touch } from '../lib/store.svelte';
  import type { LineKind, Project, Status } from '../lib/types';

  let { id }: { id: string } = $props();
  const found = $derived(projectById(id));

  let menu = $state(false);
  let sharing = $state(false);
  let showPm = $state(false);
  let photoInput = $state<HTMLInputElement>();
  // The page is re-created per project, so the starting tags only need reading once.
  let tagText = $state(untrack(() => projectById(id)?.tags.join(', ') ?? ''));
</script>

{#if !found}
  <TopBar title="Not found" showBack />
  <main class="page"><p class="muted">This project isn't here anymore.</p></main>
{:else}
  {@const p = found}
  {@render page(p)}
{/if}

{#snippet page(p: Project)}
  {@const i = stageIndex(p.status)}
  {@const t = totals(p)}
  {@const late = monthsLate(p, clock.now)}
  {@const dls = deadlinesOf(p)}
  {@const pmOpen = showPm || !!(p.pm.service || p.pm.url || p.pm.locksAt || p.pm.opensAt) || i === 2}
  {@const timeline = [
    ...p.history.map((h) => ({ at: h.at, text: `${statusInfo(h.status).emoji} ${statusInfo(h.status).label}` })),
    ...p.delays.map((dl) => ({ at: dl.at, text: `🐢 Delivery moved ${monthLabel(dl.from)} → ${monthLabel(dl.to)}${dl.note ? `: ${dl.note}` : ''}` })),
  ].sort((a, b) => a.at.localeCompare(b.at))}

  <TopBar title={p.name} showBack>
    <button class="icon-btn" aria-label="Share" onclick={() => (sharing = true)}><Icon name="share" /></button>
    <button class="icon-btn" aria-label="More" onclick={() => (menu = true)}><Icon name="more" /></button>
  </TopBar>

  <main class="page stack" style="gap:16px">
    <!-- Hero -->
    <section class="card hero">
      <button class="hero-img" aria-label="Change picture" onclick={() => photoInput?.click()}>
        <Thumb {p} size={84} />
        <span class="cam"><Icon name="camera" size={16} /></span>
      </button>
      <input
        bind:this={photoInput}
        type="file"
        accept="image/*"
        hidden
        onchange={async (e) => {
          const f = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (!f) return;
          try {
            p.image = await shrinkImage(f);
            touch(p);
          } catch {
            toast("Couldn't read that picture");
          }
        }}
      />
      <div class="hero-text">
        <h2>{p.name}</h2>
        <span class="muted small">{[p.creator, platformName(p.platform)].filter(Boolean).join(' · ')}{p.late ? ' · late pledge' : ''}</span>
        <div class="row" style="gap:6px;margin-top:6px">
          <span class="pill" style="--c: var(--s-{isOutcome(p.status) ? 'closed' : p.status})">{statusInfo(p.status).emoji} {statusInfo(p.status).label}</span>
          {#if late}<span class="late-badge">{lateLabel(late)}</span>{/if}
          {#if p.muted}<span class="tag"><Icon name="belloff" size={13} /> Muted</span>{/if}
        </div>
      </div>
      {#if p.url}
        <a class="btn small hero-link" href={p.url} target="_blank" rel="noopener">Open on {p.platform === 'other' ? 'site' : platformName(p.platform)} <Icon name="external" size={16} /></a>
      {/if}
    </section>

    <!-- Countdowns -->
    {#if dls.length}
      <section class="card stack tight">
        {#each dls as x (x.key)}
          <div class="dl-row">
            <span class="dl-text">
              <strong>{DEADLINE_LABEL[x.kind]}</strong>
              <span class="muted small">{new Date(x.at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </span>
            <Countdown at={x.at} big />
            {#if x.at > clock.now && !p.muted}
              <button class="icon-btn soft" aria-label="Add to calendar" onclick={() => addToCalendar([x], p.name)}><Icon name="calendar" size={20} /></button>
            {/if}
          </div>
        {/each}
      </section>
    {/if}

    <!-- Journey -->
    <section class="card stack">
      <h3>🧭 Where it's at</h3>
      <ol class="journey">
        {#each STAGES as s, si (s.id)}
          {@const mark = p.history.find((h) => h.status === s.id)}
          <li class:done={!isOutcome(p.status) && si <= i} class:current={p.status === s.id} style="--c: var(--s-{s.id})">
            <button
              class="j-step"
              onclick={() => {
                if (p.status === s.id) return;
                const before = $state.snapshot({ status: p.status, history: p.history, lines: p.lines });
                const paid = setStatus(p, s.id as Status);
                save();
                toast(`${s.emoji} ${s.label}${paid ? '. Pledge marked paid' : ''}`, {
                  label: 'Undo',
                  run: () => {
                    Object.assign(p, before);
                    save();
                  },
                });
              }}
            >
              <span class="j-dot">{s.emoji}</span>
              <span class="j-label">
                <strong>{s.label}</strong>
                {#if p.status === s.id}<span class="muted small">{s.hint}</span>{/if}
              </span>
            </button>
            {#if mark}
              <input class="j-date" type="date" aria-label="Date for {s.label}" bind:value={mark.at} onchange={() => touch(p)} />
            {:else if !isOutcome(p.status) && si < i}
              <button
                class="link-btn small"
                onclick={() => {
                  p.history.push({ status: s.id as Status, at: dayStr() });
                  p.history.sort((a, b) => stageIndex(a.status) - stageIndex(b.status));
                  touch(p);
                }}>+ date</button
              >
            {/if}
          </li>
        {/each}
      </ol>
      <div class="chips">
        {#each OUTCOMES as o (o.id)}
          <button
            class="chip small-chip"
            class:on={p.status === o.id}
            title={o.hint}
            onclick={() => {
              if (p.status === o.id) return;
              const before = $state.snapshot({ status: p.status, history: p.history, lines: p.lines });
              setStatus(p, o.id);
              save();
              toast(`${o.emoji} ${o.label}`, { label: 'Undo', run: () => (Object.assign(p, before), save()) });
            }}>{o.emoji} {o.label}</button
          >
        {/each}
      </div>
      {#if isOutcome(p.status)}
        {@const mark = p.history.find((h) => h.status === p.status)}
        {#if mark}
          <label class="row small">
            <span class="muted">{statusInfo(p.status).label} on</span>
            <input class="j-date" type="date" bind:value={mark.at} onchange={() => touch(p)} />
          </label>
        {/if}
      {/if}
      {#if i >= 1}
        <label class="toggle">
          <input type="checkbox" bind:checked={p.late} onchange={() => touch(p)} />
          <span>Late pledge <span class="muted small">Backed after the campaign ended</span></span>
        </label>
      {/if}
    </section>

    <!-- Campaign dates -->
    {#if i <= 1 || p.launchAt || p.endAt}
      <section class="card stack">
        <h3>🚀 Campaign</h3>
        {#if p.status === 'watching' || p.launchAt}
          <WhenField label="Launches" bind:value={p.launchAt} onchange={() => touch(p)} hint="Leave empty once it's live." />
        {/if}
        <WhenField label="Ends" bind:value={p.endAt} onchange={() => touch(p)} />
      </section>
    {/if}

    <!-- Money -->
    {#if i >= 1 || p.lines.length}
      <section class="card stack">
        <div class="sec-head">
          <h3>💰 Pledge</h3>
          <select class="mini-select" aria-label="Currency" bind:value={p.currency} onchange={() => touch(p)}>
            {#each CURRENCIES as c (c)}<option value={c}>{c}</option>{/each}
          </select>
        </div>
        <label class="field">
          <span>Tier</span>
          <input class="input" bind:value={p.tier} oninput={() => touch(p)} placeholder="All-in Gameplay, Deluxe…" />
        </label>
        {#if p.lines.length}
          <div class="lines">
            {#each p.lines as l, li (l.id)}
              <div class="line" class:paid={l.paid}>
                <select class="mini-select" aria-label="Kind" bind:value={l.kind} onchange={() => touch(p)}>
                  {#each LINE_KINDS as k (k.id)}<option value={k.id}>{k.label}</option>{/each}
                </select>
                <input class="input slim" aria-label="What" bind:value={l.label} oninput={() => touch(p)} placeholder={LINE_KINDS.find((k) => k.id === l.kind)?.placeholder} />
                <input
                  class="input slim amount"
                  aria-label="Amount"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  value={l.amount || ''}
                  oninput={(e) => ((l.amount = Number(e.currentTarget.value) || 0), touch(p))}
                  placeholder="0.00"
                />
                <label class="paid-box" title="Paid">
                  <input type="checkbox" bind:checked={l.paid} onchange={() => touch(p)} />
                  <span>Paid</span>
                </label>
                <button
                  class="remove-btn"
                  aria-label="Remove line"
                  onclick={() => {
                    const [gone] = p.lines.splice(li, 1);
                    touch(p);
                    toast('Removed', { label: 'Undo', run: () => (p.lines.splice(li, 0, gone), touch(p)) });
                  }}><Icon name="x" size={16} /></button
                >
              </div>
            {/each}
          </div>
        {/if}
        <div class="chips">
          {#each LINE_KINDS.filter((k) => k.id !== 'pledge' || !p.lines.some((l) => l.kind === 'pledge')) as k (k.id)}
            <button class="chip small-chip guess" onclick={() => (p.lines.push(newLine(k.id as LineKind, k.id === 'pledge' ? 'Pledge' : '')), touch(p))}>+ {k.label}</button>
          {/each}
        </div>
        {#if p.lines.length}
          <div class="totals">
            <span><span class="muted small">Total</span><strong>{money(t.total, p.currency)}</strong></span>
            <span><span class="muted small">Paid</span><strong>{money(t.paid, p.currency)}</strong></span>
            <span class:owe={t.owed > 0}><span class="muted small">Still to pay</span><strong>{money(t.owed, p.currency)}</strong></span>
          </div>
        {/if}
      </section>
    {/if}

    <!-- Pledge manager -->
    {#if i >= 1}
      {#if pmOpen}
        <section class="card stack">
          <h3>📋 Pledge manager</h3>
          <div class="grid2">
            <label class="field">
              <span>Service</span>
              <input class="input" list="pm-services" bind:value={p.pm.service} oninput={() => touch(p)} placeholder="BackerKit" />
              <datalist id="pm-services">{#each PM_SERVICES as s (s)}<option value={s}></option>{/each}</datalist>
            </label>
            <label class="field">
              <span>Link</span>
              <span class="row" style="flex-wrap:nowrap">
                <input class="input" type="url" inputmode="url" bind:value={p.pm.url} oninput={() => touch(p)} placeholder="https://…" />
                {#if p.pm.url}<a class="btn small" href={p.pm.url} target="_blank" rel="noopener" aria-label="Open pledge manager"><Icon name="external" size={16} /></a>{/if}
              </span>
            </label>
          </div>
          <WhenField label="Opens" bind:value={p.pm.opensAt} onchange={() => touch(p)} />
          <WhenField label="Locks" bind:value={p.pm.locksAt} onchange={() => touch(p)} hint="After this you can't change add-ons or your address. It counts down on Home." />
          <label class="toggle"><input type="checkbox" bind:checked={p.pm.surveyDone} onchange={() => touch(p)} /><span>Survey filled in</span></label>
          <label class="toggle"><input type="checkbox" bind:checked={p.pm.addressDone} onchange={() => touch(p)} /><span>Address confirmed</span></label>
          {#if p.lines.some((l) => l.kind === 'shipping') === false}
            <button class="link-btn small" style="justify-self:start" onclick={() => (p.lines.push(newLine('shipping', 'Shipping')), touch(p))}>+ Add the shipping charge to Pledge</button>
          {/if}
        </section>
      {:else}
        <button class="btn block ghost-card" onclick={() => (showPm = true)}>📋 Add pledge manager details</button>
      {/if}
    {/if}

    <!-- Delivery -->
    {#if i >= 1}
      <section class="card stack">
        <h3>🚚 Delivery</h3>
        <label class="field">
          <span>Estimated delivery</span>
          <input
            class="input"
            type="month"
            value={p.estDelivery}
            onchange={(e) => {
              const before = $state.snapshot({ estDelivery: p.estDelivery, origDelivery: p.origDelivery, delays: p.delays });
              const delay = setEstimate(p, e.currentTarget.value);
              save();
              if (delay)
                toast(`Logged a delay: ${monthLabel(delay.from)} → ${monthLabel(delay.to)}`, { label: 'Undo', run: () => (Object.assign(p, before), save()) }, 7000);
            }}
          />
        </label>
        {#if p.origDelivery && p.origDelivery !== p.estDelivery}
          <p class="muted small" style="margin:0">
            Originally {monthLabel(p.origDelivery)}{monthsPushed(p) ? `. Pushed back ${monthsPushed(p)} month${monthsPushed(p) === 1 ? '' : 's'}` : ''}.
            <button class="link-btn small" onclick={() => ((p.origDelivery = p.estDelivery), touch(p))}>Make current the original</button>
          </p>
        {/if}
        {#if p.delays.length}
          <div class="delays">
            {#each p.delays as dl, di (di)}
              <div class="delay">
                <span class="small"><strong>{monthLabel(dl.from)} → {monthLabel(dl.to)}</strong> <span class="muted">· {dayLabel(dl.at)}</span></span>
                <input class="input slim" bind:value={dl.note} oninput={() => touch(p)} placeholder="Why? (factory, freight, …)" />
                <button class="remove-btn" aria-label="Remove delay" onclick={() => (p.delays.splice(di, 1), touch(p))}><Icon name="x" size={16} /></button>
              </div>
            {/each}
          </div>
        {/if}
        {#if i >= 3}
          <div class="grid2">
            <label class="field">
              <span>Carrier</span>
              <input class="input" list="carriers" bind:value={p.carrier} oninput={() => touch(p)} placeholder="UPS" />
              <datalist id="carriers">
                {#each ['USPS', 'UPS', 'FedEx', 'DHL', 'Canada Post', 'Royal Mail', 'Australia Post', 'Evri', 'DPD', 'GLS', 'PostNL', 'Amazon'] as c (c)}<option value={c}></option>{/each}
              </datalist>
            </label>
            <label class="field">
              <span>Tracking number</span>
              <input class="input" bind:value={p.tracking} oninput={() => touch(p)} placeholder="Optional" autocapitalize="characters" />
            </label>
          </div>
          {#if p.tracking.trim()}
            <a class="btn small" style="justify-self:start" href="https://t.17track.net/en#nums={encodeURIComponent(p.tracking.trim())}" target="_blank" rel="noopener"
              >Track it on 17TRACK <Icon name="external" size={16} /></a
            >
          {/if}
        {/if}
      </section>
    {/if}

    <!-- Details -->
    <section class="card stack">
      <h3>✏️ Details</h3>
      <label class="field">
        <span>Name</span>
        <input class="input" bind:value={p.name} oninput={() => touch(p)} />
      </label>
      <div class="grid2">
        <label class="field">
          <span>Creator</span>
          <input class="input" bind:value={p.creator} oninput={() => touch(p)} />
        </label>
        <label class="field">
          <span>Platform</span>
          <select class="input" bind:value={p.platform} onchange={() => touch(p)}>
            {#each PLATFORMS as pl (pl.id)}<option value={pl.id}>{pl.name}</option>{/each}
          </select>
        </label>
      </div>
      <label class="field">
        <span>Campaign link</span>
        <input class="input" type="url" inputmode="url" bind:value={p.url} oninput={() => touch(p)} placeholder="https://…" />
      </label>
      <div class="field">
        <span>Category</span>
        <div class="chips">
          {#each app.d.settings.categories as c (c.id)}
            <button class="chip small-chip" class:on={p.category === c.id} onclick={() => ((p.category = c.id), touch(p))}>{c.emoji} {c.name}</button>
          {/each}
        </div>
      </div>
      <label class="field">
        <span>Tags <small class="muted">(comma between)</small></span>
        <input
          class="input"
          bind:value={tagText}
          onchange={() => {
            p.tags = [...new Set(tagText.split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean))];
            tagText = p.tags.join(', ');
            touch(p);
          }}
          placeholder="wave 2, retail exclusive"
        />
      </label>
      <label class="field">
        <span>Notes</span>
        <textarea class="input" bind:value={p.notes} oninput={() => touch(p)} placeholder="Stretch goals, what's in the box, who it's for…"></textarea>
      </label>
    </section>

    {#if timeline.length > 1}
      <section class="card stack tight">
        <h3>🕓 Timeline</h3>
        <ul class="timeline">
          {#each timeline as e, ei (ei)}
            <li><span class="muted small">{dayLabel(e.at)}</span> <span>{e.text}</span></li>
          {/each}
        </ul>
      </section>
    {/if}
  </main>

  {#if menu}
    <Sheet label="Project actions" onclose={() => (menu = false)}>
      <div class="menu">
        <button onclick={() => ((menu = false), (sharing = true))}><span class="ico">📤</span>Share with a friend</button>
        <button
          onclick={() => {
            p.muted = !p.muted;
            touch(p);
            menu = false;
            toast(p.muted ? 'Reminders off for this one' : 'Reminders back on');
          }}><span class="ico">{p.muted ? '🔔' : '🔕'}</span>{p.muted ? 'Turn reminders back on' : 'Mute reminders for this one'}</button
        >
        <button
          onclick={() => {
            const c = duplicate(app.d, p);
            app.d.projects.push(c);
            save();
            menu = false;
            go('p/' + c.id, true);
            toast('Copied. Rename it and set the new dates');
          }}><span class="ico">⧉</span>Duplicate (next wave, reprint…)</button
        >
        <button
          class="danger"
          onclick={() => {
            const idx = app.d.projects.indexOf(p);
            app.d.projects.splice(idx, 1);
            save();
            menu = false;
            back('projects');
            toast(`Deleted “${p.name}”`, { label: 'Undo', run: () => (app.d.projects.splice(idx, 0, p), save()) }, 8000);
          }}><span class="ico">🗑️</span>Delete</button
        >
      </div>
    </Sheet>
  {/if}
  {#if sharing}<ShareSheet projects={[p]} onclose={() => (sharing = false)} />{/if}
{/snippet}
