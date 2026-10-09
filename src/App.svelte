<script lang="ts">
  import { onMount } from 'svelte';
  import { indexedDbStorage, openDb } from './lib/db';
  import { Repo } from './lib/repo';
  import type { RecipeDetail, RecipeSummary } from './lib/types';
  import RecipeList from './components/RecipeList.svelte';
  import RecipeView from './components/RecipeView.svelte';
  import RecipeEditor from './components/RecipeEditor.svelte';

  type Screen = { name: 'list' } | { name: 'view'; id: number } | { name: 'edit'; id: number | null };

  let repo = $state<Repo | null>(null);
  let error = $state('');
  let screen = $state<Screen>({ name: 'list' });
  let recipes = $state<RecipeSummary[]>([]);
  let dishes = $state<string[]>([]);
  let detail = $state<RecipeDetail | null>(null);

  onMount(async () => {
    try {
      const db = await openDb(indexedDbStorage());
      repo = new Repo(db);
      // Ask the browser not to evict our storage; harmless if refused.
      navigator.storage?.persist?.();
      refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  function refresh() {
    if (!repo) return;
    recipes = repo.listRecipes();
    dishes = repo.listDishes();
    if (screen.name === 'view' || (screen.name === 'edit' && screen.id !== null)) {
      detail = repo.getRecipe(screen.id as number);
    }
  }

  function go(s: Screen) {
    screen = s;
    refresh();
    if (s.name === 'view' || (s.name === 'edit' && s.id !== null)) detail = repo!.getRecipe(s.id as number);
    else detail = null;
    window.scrollTo(0, 0);
  }
</script>

<main>
  {#if error}
    <p class="card">Couldn't open the recipe database: {error}</p>
  {:else if !repo}
    <p class="muted">Opening your recipe book…</p>
  {:else if screen.name === 'list'}
    <RecipeList {recipes} onOpen={(id) => go({ name: 'view', id })} onNew={() => go({ name: 'edit', id: null })} />
  {:else if screen.name === 'view' && detail}
    <RecipeView
      {detail}
      onBack={() => go({ name: 'list' })}
      onEdit={() => go({ name: 'edit', id: detail!.id })}
      onRestore={async (vid) => { await repo!.restoreVersion(detail!.id, vid); go({ name: 'view', id: detail!.id }); }}
      onDelete={async () => { await repo!.softDelete(detail!.id); go({ name: 'list' }); }}
    />
  {:else if screen.name === 'edit'}
    <RecipeEditor
      {detail}
      {dishes}
      onCancel={() => go(detail ? { name: 'view', id: detail.id } : { name: 'list' })}
      onSave={async (dish, name, content, major) => {
        const id = detail
          ? (await repo!.saveEdit(detail.id, dish, name, content, major), detail.id)
          : await repo!.createRecipe(dish, name, content);
        go({ name: 'view', id });
      }}
    />
  {/if}
</main>
