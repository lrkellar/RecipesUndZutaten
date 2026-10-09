import { describe, expect, it } from 'vitest';
import { memoryStorage, openDb } from './db';
import { Repo } from './repo';
import { emptyContent } from './types';
import { nextEditLabel, nextMajorLabel, restoreLabel } from './versionLabel';

describe('version labels', () => {
  it('increments edits, restores and majors', () => {
    expect(nextEditLabel('1.0')).toBe('1.1');
    expect(nextEditLabel('2.3.1')).toBe('2.3.2');
    expect(restoreLabel('2.3')).toBe('2.3.1');
    expect(restoreLabel('2.3.2')).toBe('2.3.2.1');
    expect(nextMajorLabel('2.3.1')).toBe('3.0');
  });
});

async function setup() {
  const storage = memoryStorage();
  const db = await openDb(storage);
  return { db, repo: new Repo(db), storage };
}

function content(sugar: number) {
  const c = emptyContent();
  c.ingredients = [{ group: '', quantity: sugar, unit: 'tbsp', name: 'sugar', prep: '', optional: false }];
  c.steps = [{ text: 'Mix.', timer_seconds: 60, temperature: '' }];
  return c;
}

describe('repo', () => {
  it('creates a recipe with version 1.0 and reads it back', async () => {
    const { repo } = await setup();
    const id = await repo.createRecipe('Baklava', 'Baklava Baskets', content(2));
    const r = repo.getRecipe(id)!;
    expect(r.label).toBe('1.0');
    expect(r.dish).toBe('Baklava');
    expect(r.content.ingredients[0].quantity).toBe(2);
    expect(r.content.steps[0].timer_seconds).toBe(60);
  });

  it('edits make new snapshots; restore appends .1 and keeps history', async () => {
    const { repo } = await setup();
    const id = await repo.createRecipe('Baklava', 'Baklava Baskets', content(2));
    const v1 = repo.getRecipe(id)!.currentVersionId;
    await repo.saveEdit(id, 'Baklava', 'Baklava Baskets', content(3));
    await repo.saveEdit(id, 'Baklava', 'Baklava Baskets', content(4));
    expect(repo.getRecipe(id)!.label).toBe('1.2');
    await repo.restoreVersion(id, v1);
    const r = repo.getRecipe(id)!;
    expect(r.label).toBe('1.2.1');
    expect(r.content.ingredients[0].quantity).toBe(2);
    expect(r.versions.map((v) => v.label)).toEqual(['1.2.1', '1.2', '1.1', '1.0']);
  });

  it('soft-deleted recipes disappear from the list', async () => {
    const { repo } = await setup();
    const id = await repo.createRecipe('Cookies', 'Choc chip', content(1));
    await repo.softDelete(id);
    expect(repo.listRecipes()).toHaveLength(0);
  });

  it('survives a save/reload round trip through storage', async () => {
    const { repo, storage } = await setup();
    await repo.createRecipe('Cookies', 'Choc chip', content(1));
    const reopened = new Repo(await openDb(storage));
    expect(reopened.listRecipes()[0].name).toBe('Choc chip');
  });
});
