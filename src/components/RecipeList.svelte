<script lang="ts">
  import type { RecipeSummary } from '../lib/types';

  let { recipes, onOpen, onNew }: {
    recipes: RecipeSummary[];
    onOpen: (id: number) => void;
    onNew: () => void;
  } = $props();

  let q = $state('');
  const filtered = $derived(
    recipes.filter((r) => `${r.name} ${r.dish}`.toLowerCase().includes(q.trim().toLowerCase()))
  );
  const groups = $derived(
    Object.entries(
      filtered.reduce<Record<string, RecipeSummary[]>>((acc, r) => ((acc[r.dish] ??= []).push(r), acc), {})
    )
  );
</script>

<header class="bar"><h1>Recipe Book</h1></header>

<input type="search" placeholder="Search recipes or dishes" bind:value={q} style="margin-top:12px" />

{#if recipes.length === 0}
  <p class="card muted">No recipes yet. Tap “New recipe” to add your first one.</p>
{:else if groups.length === 0}
  <p class="muted">Nothing matches “{q}”.</p>
{/if}

{#each groups as [dish, items]}
  <h3>{dish}</h3>
  {#each items as r}
    <button class="recipe-link" onclick={() => onOpen(r.id)}>
      <strong>{r.name}</strong>
      <span class="muted"> · v{r.label}{r.total_min ? ` · ${r.total_min} min` : ''}</span>
    </button>
  {/each}
{/each}

<button class="primary fab" onclick={onNew}>＋ New recipe</button>
