<script lang="ts">
  import type { RecipeDetail } from '../lib/types';

  let { detail, onBack, onEdit, onRestore, onDelete }: {
    detail: RecipeDetail;
    onBack: () => void;
    onEdit: () => void;
    onRestore: (versionId: number) => void;
    onDelete: () => void;
  } = $props();

  const c = $derived(detail.content);
  let showHistory = $state(false);

  // Group ingredients under their "for the syrup" style headings, preserving order.
  const groups = $derived.by(() => {
    const out: { name: string; rows: typeof c.ingredients }[] = [];
    for (const row of c.ingredients) {
      let g = out.find((x) => x.name === row.group);
      if (!g) out.push((g = { name: row.group, rows: [] }));
      g.rows.push(row);
    }
    return out;
  });

  function qty(n: number | null) {
    return n === null ? '' : String(Math.round(n * 1000) / 1000);
  }
  function confirmDelete() {
    if (confirm(`Delete “${detail.name}” and all its versions?`)) onDelete();
  }
</script>

<header class="bar">
  <button class="link" onclick={onBack}>‹ Back</button>
  <span style="flex:1"></span>
  <button onclick={onEdit}>Edit</button>
</header>

<p class="muted" style="margin-bottom:0">{detail.dish}</p>
<h2 style="margin-top:0">{detail.name}</h2>
<p><span class="pill">v{detail.label}</span>
  {#if c.course}<span class="pill">{c.course}</span>{/if}
  {#if c.cuisine}<span class="pill">{c.cuisine}</span>{/if}
  {#each c.tags as t}<span class="pill">{t}</span>{/each}
</p>
{#if c.description}<p>{c.description}</p>{/if}
<p class="muted">
  {#if c.yield_text}Makes {c.yield_text}{/if}
  {#if c.active_min} · {c.active_min} min active{/if}
  {#if c.passive_min} · {c.passive_min} min passive{/if}
  {#if c.total_min} · {c.total_min} min total{/if}
</p>

<section class="card">
  <h3 style="margin-top:0">Ingredients</h3>
  {#each groups as g}
    {#if g.name}<strong>{g.name}</strong>{/if}
    <ul class="plain">
      {#each g.rows as i}
        <li>
          {qty(i.quantity)} {i.unit} <strong>{i.name}</strong>{i.prep ? `, ${i.prep}` : ''}
          {#if i.optional}<span class="muted"> (optional)</span>{/if}
        </li>
      {/each}
    </ul>
  {/each}
</section>

{#if c.tools.length}
  <section class="card">
    <h3 style="margin-top:0">Tools</h3>
    <ul class="plain">
      {#each c.tools as t}<li>{t.name}{t.spec ? ` (${t.spec})` : ''}{t.optional ? ' · optional' : ''}</li>{/each}
    </ul>
  </section>
{/if}

<section class="card">
  <h3 style="margin-top:0">Steps</h3>
  <ol style="padding-left:20px; margin:0">
    {#each c.steps as s}
      <li style="margin-bottom:8px">
        {s.text}
        {#if s.timer_seconds}<span class="muted"> · {Math.round(s.timer_seconds / 60)} min</span>{/if}
        {#if s.temperature}<span class="muted"> · {s.temperature}</span>{/if}
      </li>
    {/each}
  </ol>
</section>

{#if c.tips}
  <section class="card"><h3 style="margin-top:0">Tips</h3><p style="margin:0; white-space:pre-wrap">{c.tips}</p></section>
{/if}

<p>
  <button class="link" onclick={() => (showHistory = !showHistory)}>
    {showHistory ? 'Hide' : 'Show'} version history ({detail.versions.length})
  </button>
</p>
{#if showHistory}
  <ul class="plain card">
    {#each detail.versions as v}
      <li class="row" style="justify-content:space-between; padding:4px 0">
        <span>v{v.label} <span class="muted">· {new Date(v.saved_at).toLocaleString()}</span></span>
        {#if v.id === detail.currentVersionId}
          <span class="pill">current</span>
        {:else}
          <button class="link" onclick={() => onRestore(v.id)}>Restore</button>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<p style="margin-top:32px"><button class="link danger" onclick={confirmDelete}>Delete recipe</button></p>
