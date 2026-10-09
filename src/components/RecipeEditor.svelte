<script lang="ts">
  import { emptyContent, type RecipeDetail, type VersionContent } from '../lib/types';

  let { detail, dishes, onCancel, onSave }: {
    detail: RecipeDetail | null;
    dishes: string[];
    onCancel: () => void;
    onSave: (dish: string, name: string, content: VersionContent, major: boolean) => void;
  } = $props();

  // Editing works on a copy taken when the editor opens; nothing is saved until Save.
  // svelte-ignore state_referenced_locally
  let dish = $state(detail?.dish ?? '');
  let name = $state(detail?.name ?? '');
  let c = $state<VersionContent>(detail ? structuredClone($state.snapshot(detail.content)) : emptyContent());
  let tagText = $state(detail ? detail.content.tags.join(', ') : '');
  let major = $state(false);

  const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v));
  const canSave = $derived(name.trim() !== '' && dish.trim() !== '');

  function save() {
    c.tags = tagText.split(',').map((t) => t.trim()).filter(Boolean);
    onSave(dish, name, $state.snapshot(c) as VersionContent, major);
  }
</script>

<header class="bar">
  <button class="link" onclick={onCancel}>Cancel</button>
  <h1>{detail ? `Edit (new version after v${detail.label})` : 'New recipe'}</h1>
  <button class="primary" disabled={!canSave} onclick={save}>Save</button>
</header>

<label for="dish">Dish family (e.g. Baklava)</label>
<input id="dish" list="dish-list" bind:value={dish} />
<datalist id="dish-list">{#each dishes as d}<option value={d}></option>{/each}</datalist>

<label for="name">Recipe name (e.g. Baklava Baskets)</label>
<input id="name" bind:value={name} />

<label for="desc">Description</label>
<textarea id="desc" bind:value={c.description}></textarea>

<div class="row">
  <div style="flex:1"><label for="yield">Yield</label><input id="yield" bind:value={c.yield_text} placeholder="24 baskets" /></div>
  <div style="flex:1"><label for="course">Course</label><input id="course" bind:value={c.course} placeholder="baking - dessert" /></div>
</div>
<div class="row">
  <div style="flex:1"><label for="act">Active min</label><input id="act" inputmode="numeric" value={c.active_min ?? ''} oninput={(e) => (c.active_min = num(e.currentTarget.value))} /></div>
  <div style="flex:1"><label for="pas">Passive min</label><input id="pas" inputmode="numeric" value={c.passive_min ?? ''} oninput={(e) => (c.passive_min = num(e.currentTarget.value))} /></div>
  <div style="flex:1"><label for="tot">Total min</label><input id="tot" inputmode="numeric" value={c.total_min ?? ''} oninput={(e) => (c.total_min = num(e.currentTarget.value))} /></div>
</div>

<label for="tags">Tags (comma separated)</label>
<input id="tags" bind:value={tagText} />

<h3>Ingredients</h3>
{#each c.ingredients as ing, i}
  <div class="ing-row">
    <input placeholder="Qty" inputmode="decimal" value={ing.quantity ?? ''} oninput={(e) => (ing.quantity = num(e.currentTarget.value))} />
    <input placeholder="Unit" bind:value={ing.unit} />
    <input placeholder="Ingredient" bind:value={ing.name} />
    <button class="link" aria-label="Remove ingredient" onclick={() => c.ingredients.splice(i, 1)}>✕</button>
  </div>
  <div class="row" style="margin:-2px 0 10px">
    <input placeholder="prep (chopped)" bind:value={ing.prep} />
    <input placeholder="group (for the syrup)" bind:value={ing.group} />
    <label style="margin:0; white-space:nowrap"><input type="checkbox" style="width:auto" bind:checked={ing.optional} /> optional</label>
  </div>
{/each}
<button onclick={() => c.ingredients.push({ group: c.ingredients.at(-1)?.group ?? '', quantity: null, unit: '', name: '', prep: '', optional: false })}>＋ Ingredient</button>

<h3>Steps</h3>
{#each c.steps as s, i}
  <div class="card">
    <label for={`s${i}`}>Step {i + 1}</label>
    <textarea id={`s${i}`} bind:value={s.text}></textarea>
    <div class="row">
      <input placeholder="Timer (min)" inputmode="numeric"
        value={s.timer_seconds ? s.timer_seconds / 60 : ''}
        oninput={(e) => { const n = num(e.currentTarget.value); s.timer_seconds = n === null ? null : Math.round(n * 60); }} />
      <input placeholder="Temperature (350°F)" bind:value={s.temperature} />
      <button class="link" aria-label="Remove step" onclick={() => c.steps.splice(i, 1)}>✕</button>
    </div>
  </div>
{/each}
<button onclick={() => c.steps.push({ text: '', timer_seconds: null, temperature: '' })}>＋ Step</button>

<h3>Tools</h3>
{#each c.tools as t, i}
  <div class="row" style="margin-bottom:6px">
    <input placeholder="Tool" bind:value={t.name} />
    <input placeholder="Size / spec (9x13)" bind:value={t.spec} />
    <button class="link" aria-label="Remove tool" onclick={() => c.tools.splice(i, 1)}>✕</button>
  </div>
{/each}
<button onclick={() => c.tools.push({ name: '', spec: '', optional: false })}>＋ Tool</button>

<label for="tips">Tips (lessons that apply every time)</label>
<textarea id="tips" bind:value={c.tips}></textarea>

<label for="src">Source URL</label>
<input id="src" bind:value={c.source_url} />
<label for="raw">Original text (paste raw, tidy later)</label>
<textarea id="raw" bind:value={c.source_text}></textarea>
<label style="display:flex; gap:8px; align-items:center"><input type="checkbox" style="width:auto" bind:checked={c.needs_review} /> Needs review</label>

{#if detail}
  <label style="display:flex; gap:8px; align-items:center; margin-top:20px">
    <input type="checkbox" style="width:auto" bind:checked={major} /> Save as a new major version
  </label>
{/if}
<div style="height:24px"></div>
