import type { Db } from './db';
import type { RecipeDetail, RecipeSummary, VersionContent, VersionInfo } from './types';
import { FIRST_LABEL, nextEditLabel, nextMajorLabel, restoreLabel } from './versionLabel';

const now = () => new Date().toISOString();
const clean = (s: string) => s.trim();

export class Repo {
  constructor(private db: Db) {}

  listRecipes(): RecipeSummary[] {
    return this.db.all<RecipeSummary>(`
      SELECT r.id, r.name, d.name AS dish, v.label, r.status, v.total_min
      FROM recipe r
      JOIN dish_family d ON d.id = r.dish_family_id
      JOIN version v ON v.id = r.current_version_id
      WHERE r.deleted_at IS NULL
      ORDER BY d.name COLLATE NOCASE, r.name COLLATE NOCASE`);
  }

  listDishes(): string[] {
    return this.db.all<{ name: string }>('SELECT name FROM dish_family ORDER BY name COLLATE NOCASE').map((r) => r.name);
  }

  getRecipe(id: number): RecipeDetail | null {
    const r = this.db.all<any>(
      `SELECT r.id, r.name, r.status, r.current_version_id, d.name AS dish
       FROM recipe r JOIN dish_family d ON d.id = r.dish_family_id
       WHERE r.id = ? AND r.deleted_at IS NULL`, [id])[0];
    if (!r) return null;
    const { label, content } = this.readVersion(r.current_version_id);
    return {
      id: r.id, name: r.name, dish: r.dish, status: r.status,
      currentVersionId: r.current_version_id, label, content,
      versions: this.listVersions(id)
    };
  }

  listVersions(recipeId: number): VersionInfo[] {
    return this.db.all<VersionInfo>(
      'SELECT id, label, saved_at, parent_version_id FROM version WHERE recipe_id = ? ORDER BY id DESC', [recipeId]);
  }

  readVersion(versionId: number): { label: string; content: VersionContent } {
    const v = this.db.all<any>('SELECT * FROM version WHERE id = ?', [versionId])[0];
    if (!v) throw new Error(`Version ${versionId} not found`);
    const ingredients = this.db.all<any>('SELECT * FROM ingredient_row WHERE version_id = ? ORDER BY position', [versionId])
      .map((i) => ({ group: i.grp, quantity: i.quantity, unit: i.unit, name: i.name, prep: i.prep, optional: !!i.optional }));
    const steps = this.db.all<any>('SELECT * FROM step WHERE version_id = ? ORDER BY position', [versionId])
      .map((s) => ({ text: s.text, timer_seconds: s.timer_seconds, temperature: s.temperature }));
    const tools = this.db.all<any>('SELECT * FROM tool WHERE version_id = ? ORDER BY position', [versionId])
      .map((t) => ({ name: t.name, spec: t.spec, optional: !!t.optional }));
    return {
      label: v.label,
      content: {
        description: v.description, source_url: v.source_url, source_text: v.source_text,
        needs_review: !!v.needs_review, yield_text: v.yield_text,
        active_min: v.active_min, passive_min: v.passive_min, total_min: v.total_min,
        course: v.course, cuisine: v.cuisine, tags: JSON.parse(v.tags), tips: v.tips, storage: v.storage,
        ingredients, steps, tools
      }
    };
  }

  private findOrCreateDish(name: string): number {
    const n = clean(name) || 'Uncategorized';
    const existing = this.db.all<{ id: number }>('SELECT id FROM dish_family WHERE name = ?', [n])[0];
    return existing ? existing.id : this.db.run('INSERT INTO dish_family (name) VALUES (?)', [n]);
  }

  /** Inserts a full snapshot. Must be called inside tx(). Returns the new version id. */
  private insertVersion(recipeId: number, parentId: number | null, label: string, c: VersionContent): number {
    const vid = this.db.run(
      `INSERT INTO version (recipe_id, parent_version_id, label, saved_at, description, source_url, source_text,
         needs_review, yield_text, active_min, passive_min, total_min, course, cuisine, tags, tips, storage)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [recipeId, parentId, label, now(), c.description, c.source_url, c.source_text, c.needs_review ? 1 : 0,
       c.yield_text, c.active_min, c.passive_min, c.total_min, c.course, c.cuisine,
       JSON.stringify(c.tags), c.tips, c.storage]);
    c.ingredients.filter((i) => clean(i.name)).forEach((i, pos) =>
      this.db.run(
        'INSERT INTO ingredient_row (version_id, position, grp, quantity, unit, name, prep, optional) VALUES (?,?,?,?,?,?,?,?)',
        [vid, pos, clean(i.group), i.quantity, clean(i.unit), clean(i.name), clean(i.prep), i.optional ? 1 : 0]));
    c.steps.filter((s) => clean(s.text)).forEach((s, pos) =>
      this.db.run('INSERT INTO step (version_id, position, text, timer_seconds, temperature) VALUES (?,?,?,?,?)',
        [vid, pos, clean(s.text), s.timer_seconds, clean(s.temperature)]));
    c.tools.filter((t) => clean(t.name)).forEach((t, pos) =>
      this.db.run('INSERT INTO tool (version_id, position, name, spec, optional) VALUES (?,?,?,?,?)',
        [vid, pos, clean(t.name), clean(t.spec), t.optional ? 1 : 0]));
    return vid;
  }

  createRecipe(dish: string, name: string, content: VersionContent): Promise<number> {
    return this.db.tx(() => {
      const dishId = this.findOrCreateDish(dish);
      const rid = this.db.run('INSERT INTO recipe (dish_family_id, name, created_at) VALUES (?,?,?)',
        [dishId, clean(name), now()]);
      const vid = this.insertVersion(rid, null, FIRST_LABEL, content);
      this.db.run('UPDATE recipe SET current_version_id = ? WHERE id = ?', [vid, rid]);
      return rid;
    });
  }

  /** Every saved edit is a full snapshot with a new label. `major` jumps to the next whole number. */
  saveEdit(recipeId: number, dish: string, name: string, content: VersionContent, major = false): Promise<number> {
    return this.db.tx(() => {
      const head = this.headOf(recipeId);
      const label = major ? nextMajorLabel(head.label) : nextEditLabel(head.label);
      const dishId = this.findOrCreateDish(dish);
      this.db.run('UPDATE recipe SET dish_family_id = ?, name = ? WHERE id = ?', [dishId, clean(name), recipeId]);
      const vid = this.insertVersion(recipeId, head.id, label, content);
      this.db.run('UPDATE recipe SET current_version_id = ? WHERE id = ?', [vid, recipeId]);
      return vid;
    });
  }

  /** Restoring never rewrites history: it copies the old snapshot into a new "<head>.1" version. */
  restoreVersion(recipeId: number, versionId: number): Promise<number> {
    return this.db.tx(() => {
      const head = this.headOf(recipeId);
      const { content } = this.readVersion(versionId);
      const vid = this.insertVersion(recipeId, head.id, restoreLabel(head.label), content);
      this.db.run('UPDATE recipe SET current_version_id = ? WHERE id = ?', [vid, recipeId]);
      return vid;
    });
  }

  softDelete(recipeId: number): Promise<void> {
    return this.db.tx(() => {
      this.db.run('UPDATE recipe SET deleted_at = ? WHERE id = ?', [now(), recipeId]);
    });
  }

  private headOf(recipeId: number): { id: number; label: string } {
    const row = this.db.all<{ id: number; label: string }>(
      'SELECT v.id, v.label FROM recipe r JOIN version v ON v.id = r.current_version_id WHERE r.id = ?', [recipeId])[0];
    if (!row) throw new Error(`Recipe ${recipeId} not found`);
    return row;
  }
}
