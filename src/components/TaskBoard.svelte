<script lang="ts">
  import { onMount } from 'svelte';

  type List = 'signal' | 'noise' | 'done';
  type Task = {
    id: string;
    text: string;
    list: List;
    done?: boolean;
    createdAt: number;
    updatedAt: number;
    context?: string;
    open?: boolean; // context open
  };

  let tasks: Task[] = [];
  let input = '';
  let inputEl: HTMLInputElement | null = null;
  let editingId: string | null = null;
  let editText = '';
  let focusedId: string | null = null;
  let peekId: string | null = null;
  let focusSignal = false;
  let demoMode = false;
  let selectedCompleted = new Set<string>();
  let streak = 0;
  let lastStreakDay = '';

  const save = () => {
    localStorage.setItem('svns_tasks', JSON.stringify(tasks));
    localStorage.setItem('svns_streak', JSON.stringify({ streak, lastStreakDay }));
    // Update streak if Signal empty
    const hasSignal = tasks.some(t => t.list==='signal' && !t.done);
    const today = new Date().toISOString().slice(0,10);
    if (!hasSignal) {
      if (lastStreakDay !== today) {
        const prev = lastStreakDay;
        const yday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
        streak = prev === today ? streak : (prev === yday ? streak + 1 : 1);
        lastStreakDay = today;
      }
    }
  };
  const load = () => {
    try {
      const raw = localStorage.getItem('svns_tasks');
      tasks = raw ? JSON.parse(raw) : [];
    } catch { tasks = []; }
    try {
      const rawS = localStorage.getItem('svns_streak');
      const s = rawS ? JSON.parse(rawS) : null;
      if (s) { streak = s.streak || 0; lastStreakDay = s.lastStreakDay || ''; }
    } catch {}
  };

  const id = () => Math.random().toString(36).slice(2,9);

  function add(list: List, opts: { text: string; force?: boolean; context?: string; open?: boolean; reason?: string } ) {
    let text = opts.text.trim();
    if (!text) return;
    // Cap Signal to 5
    if (list === 'signal' && !opts.force) {
      const count = tasks.filter(t => t.list==='signal' && !t.done).length;
      if (count >= 5) list = 'noise';
    }
    const t: Task = { id: id(), text, list, createdAt: Date.now(), updatedAt: Date.now(), context: opts.context || '', open: !!opts.open };
    tasks = [...tasks, t];
    save();
    input = '';
    if (opts.reason) dispatchToast(opts.reason);
  }

  function move(taskId: string, to: List) {
    tasks = tasks.map(t => t.id === taskId ? { ...t, list: to, updatedAt: Date.now(), done: to==='done' } : t);
    save();
  }
  function remove(taskId: string) {
    tasks = tasks.filter(t => t.id !== taskId);
    save();
  }
  function patch(taskId: string, partial: Partial<Task>) {
    tasks = tasks.map(t => t.id === taskId ? { ...t, ...partial, updatedAt: Date.now() } : t);
    save();
  }

  function startEdit(t: Task) {
    editingId = t.id; editText = t.text;
  }
  function commitEdit() {
    if (!editingId) return;
    const txt = editText.trim();
    if (!txt) { editingId = null; return; }
    patch(editingId, { text: txt });
    editingId = null; editText = '';
  }
  function cancelEdit() { editingId = null; editText = ''; }

  function dispatchToast(msg: string) { /* toasts disabled */ }

  function parseComposer(raw: string): { list: List; text: string; force?: boolean; context?: string; open?: boolean; reason?: string } {
    let text = raw.trim(); let list: List = 'signal'; let force=false; let context=''; let open=false; let reason='';
    if (text.startsWith('>')) { list = 'noise'; text = text.replace(/^>+\s*/, ''); }
    if (text.startsWith('!')) { force = true; text = text.replace(/^!+\s*/, ''); reason = 'Forced to Signal'; }
    if (text.startsWith('/meet')) { text = text.replace(/^\/meet\s*/, '').trim(); context = 'Agenda:\n- \n\nNotes:\n- '; open = true; reason = 'Meeting template'; }
    return { list, text, force, context, open, reason };
  }
  function addFromComposer(ctrl: boolean) {
    const spec = parseComposer(input);
    const list = ctrl ? 'noise' : spec.list;
    add(list, { text: spec.text, force: spec.force, context: spec.context, open: spec.open, reason: spec.reason });
  }
  function handleComposerKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addFromComposer(e.ctrlKey || e.metaKey); }
  }

  function formatAge(ts: number) {
    const days = Math.floor((Date.now() - ts) / 86400000);
    return days + 'd';
  }

  // Drag and drop helpers
  let dragId: string | null = null;
  let overList: List | null = null;
  function onDragStart(e: DragEvent, t: Task) {
    dragId = t.id; e.dataTransfer?.setData('text/plain', t.id);
    const el = e.target as HTMLElement; el.classList.add('dragging');
  }
  function onDragEnd(e: DragEvent) { const el = e.target as HTMLElement; el.classList.remove('dragging'); dragId = null; overList = null; }
  function allowDrop(e: DragEvent, list: List) { e.preventDefault(); overList = list; }
  function onDrop(e: DragEvent, list: List) { e.preventDefault(); const id = e.dataTransfer?.getData('text/plain') || dragId; if (id) move(id, list); }

  function toggleFocus() {
    focusSignal = !focusSignal; dispatchToast(focusSignal ? 'Focus: Signal only' : 'Focus: All');
  }

  function copySummary() {
    const sig = tasks.filter(t => t.list==='signal' && !t.done).map(t => `• ${t.text}`).join('\n');
    navigator.clipboard.writeText(sig || '');
    dispatchToast('Copied Signal summary');
  }
  function exportJSON() {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'signal-v-noise.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function onCtxChange(id: string, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    patch(id, { context: target.value });
  }

  function clearOld() {
    const cutoff = Date.now() - 14*86400000;
    tasks = tasks.filter(t => !(t.list==='done' && t.updatedAt < cutoff));
    save();
  }
  function restoreSelected() {
    tasks = tasks.map(t => selectedCompleted.has(t.id) ? { ...t, list: 'noise', done: false } : t);
  selectedCompleted = new Set(); save();
  }
  function deleteSelected() {
    tasks = tasks.filter(t => !selectedCompleted.has(t.id));
  selectedCompleted = new Set(); save();
  }

  function onCompletedToggle(id: string, event: Event) {
    const target = event.target as HTMLInputElement;
  if (target.checked) selectedCompleted.add(id); else selectedCompleted.delete(id);
  selectedCompleted = new Set(selectedCompleted);
  }

  function onGlobalKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    const typing = target && (['INPUT','TEXTAREA'].includes(target.tagName) || target.isContentEditable);
    if (!typing && e.key.toLowerCase()==='a') { inputEl?.focus(); e.preventDefault(); return; }
    if (!typing && e.key.toLowerCase()==='f') { toggleFocus(); e.preventDefault(); return; }
  if (!typing && e.key===' ' && focusedId) { e.preventDefault(); peekId = focusedId; return; }
    if (e.key==='Escape' && editingId) { cancelEdit(); }
  }
  function onGlobalKeyUp(e: KeyboardEvent) {
    if (e.key===' ') peekId = null;
  }

  onMount(() => {
    load();
    window.addEventListener('keydown', onGlobalKey);
    window.addEventListener('keyup', onGlobalKeyUp);
    const onDemo = (ev: any) => { demoMode = !!ev.detail; };
    window.addEventListener('svns-demo', onDemo);
    return () => {
      window.removeEventListener('keydown', onGlobalKey);
      window.removeEventListener('keyup', onGlobalKeyUp);
      window.removeEventListener('svns-demo', onDemo);
    };
  });
</script>

<div class="max-w-[1100px] mx-auto mt-4">
  <div class="flex items-center justify-between mb-2">
    <div class="text-neutral-400 text-sm">Stay in the orange. Keep Signal tight.</div>
    <div class="flex items-center gap-2">
      <button class="icon-btn" title="Copy Signal" on:click={copySummary}>
        <!-- bold-line copy icon -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
      </button>
      <button class="icon-btn" title="Export JSON" on:click={exportJSON}>
        <!-- bold-line download icon -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
      </button>
    </div>
  </div>

  <div class="glass p-4">
    <div class="flex items-center gap-3">
      <input bind:this={inputEl} class="big flex-1 w-auto" type="text" placeholder="> Write the next thing..." bind:value={input} on:keydown={handleComposerKeyDown} />
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" class="btn btn-primary" on:click={() => addFromComposer(false)}>
          Signal (Enter)
        </button>
        <button type="button" class="btn btn-ghost" on:click={() => addFromComposer(true)}>
          Noise (Ctrl+Enter)
        </button>
      </div>
    </div>
    {#if demoMode}
      <div class="mt-2 text-xs text-neutral-500">Press A to focus the composer</div>
    {/if}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
    <section class="glass p-4 relative">
      <header class="flex items-center justify-between mb-2">
        <h2 class="font-semibold text-neutral-200">Signal</h2>
        <button class="icon-btn" on:click={toggleFocus} title="Focus Signal">
          <!-- bold-lined expand icon -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>
        </button>
      </header>
      <ul on:dragover={(e)=>allowDrop(e,'signal')} on:drop={(e)=>onDrop(e,'signal')} class="space-y-2">
        {#each tasks.filter(t=>t.list==='signal' && !t.done) as t (t.id)}
          <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
          <li class="p-3 rounded-lg bg-white/5" draggable on:dragstart={(e)=>onDragStart(e,t)} on:dragend={onDragEnd} tabindex="0" on:focus={() => focusedId = t.id}>
            {#if editingId === t.id}
              <input class="w-full bg-black/30 rounded-md px-2 py-1" bind:value={editText} on:keydown={(e)=>{ if(e.key==='Enter'){commitEdit();} if(e.key==='Escape'){cancelEdit();}}} />
            {:else}
              <div class="flex items-start gap-2">
                <button class="icon-btn" title="Done" on:click={() => move(t.id,'done')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </button>
                <div class="flex-1">
                  <div class="text-sm">{t.text}</div>
                  <div class="mt-1">
                    <button class="icon-btn text-xs" on:click={() => patch(t.id, { open: !t.open })}>{t.open ? 'Hide' : 'Context'}</button>
                    {#if t.context && !t.open}<span class="context-dot" title="Has context"></span>{/if}
                  </div>
                  {#if t.open || peekId===t.id}
                    <textarea class="mt-2 w-full text-sm bg-black/30 rounded-md px-2 py-1" rows="3" bind:value={t.context} on:change={(e)=>onCtxChange(t.id, e)}></textarea>
                  {/if}
                </div>
                <div class="flex items-center gap-1">
                  <button class="icon-btn" title="Edit" on:click={() => startEdit(t)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button class="icon-btn" title="Noise" on:click={() => move(t.id,'noise')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  <button class="icon-btn" title="Delete" on:click={() => remove(t.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      {#if tasks.filter(t=>t.list==='signal' && !t.done).length===0}
        <div class="mt-3 text-xs text-neutral-500">Empty. Good job. Streak: {streak}d</div>
      {/if}
    </section>

    {#if !focusSignal}
    <section class="glass p-4">
      <header class="flex items-center justify-between mb-2">
        <h2 class="font-semibold text-neutral-200">Noise</h2>
      </header>
      <ul on:dragover={(e)=>allowDrop(e,'noise')} on:drop={(e)=>onDrop(e,'noise')} class="space-y-2">
        {#each tasks.filter(t=>t.list==='noise' && !t.done) as t (t.id)}
          <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
          <li class="p-3 rounded-lg bg-white/5" draggable on:dragstart={(e)=>onDragStart(e,t)} on:dragend={onDragEnd} tabindex="0" on:focus={() => focusedId = t.id}>
            {#if editingId === t.id}
              <input class="w-full bg-black/30 rounded-md px-2 py-1" bind:value={editText} on:keydown={(e)=>{ if(e.key==='Enter'){commitEdit();} if(e.key==='Escape'){cancelEdit();}}} />
            {:else}
              <div class="flex items-start gap-2">
                <button class="icon-btn" title="Promote to Signal" on:click={() => move(t.id,'signal')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14l5-5 5 5"/></svg>
                </button>
                <div class="flex-1">
                  <div class="text-sm">{t.text}</div>
                  <div class="mt-1">
                    <button class="icon-btn text-xs" on:click={() => patch(t.id, { open: !t.open })}>{t.open ? 'Hide' : 'Context'}</button>
                    {#if t.context && !t.open}<span class="context-dot" title="Has context"></span>{/if}
                  </div>
                  {#if t.open || peekId===t.id}
                    <textarea class="mt-2 w-full text-sm bg-black/30 rounded-md px-2 py-1" rows="3" bind:value={t.context} on:change={(e)=>onCtxChange(t.id, e)}></textarea>
                  {/if}
                </div>
                <div class="flex items-center gap-1">
                  <button class="icon-btn" title="Edit" on:click={() => startEdit(t)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button class="icon-btn" title="Delete" on:click={() => remove(t.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
    {/if}
  </div>

  <section class="glass p-4 mt-4">
    <header class="flex items-center justify-between mb-2">
      <h2 class="font-semibold text-neutral-200">Completed</h2>
      <div class="flex items-center gap-2 text-xs">
        <button class="icon-btn" on:click={clearOld}>Clear old (&gt;14d)</button>
        {#if selectedCompleted.size}
          <button class="icon-btn" on:click={restoreSelected}>Restore ({selectedCompleted.size})</button>
          <button class="icon-btn" on:click={deleteSelected}>Delete ({selectedCompleted.size})</button>
        {/if}
      </div>
    </header>
  <ul on:dragover={(e)=>allowDrop(e,'done')} on:drop={(e)=>onDrop(e,'done')} class="space-y-2">
      {#each tasks.filter(t=>t.list==='done') as t (t.id)}
    <li class="p-3 rounded-lg bg-white/5 flex items-center gap-2">
          <input type="checkbox" class="checkbox-lg" checked={selectedCompleted.has(t.id)} on:change={(e)=>onCompletedToggle(t.id, e)} />
          <div class="flex-1 opacity-80" style="opacity: {Math.max(0.4, 1 - (Date.now()-t.updatedAt)/ (14*86400000))}">{t.text}</div>
          <div class="text-xs text-neutral-500" title={new Date(t.updatedAt).toLocaleString()}>{formatAge(t.updatedAt)}</div>
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  textarea { resize: vertical; }
</style>
