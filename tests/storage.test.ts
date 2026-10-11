import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtMeta, Project } from '../src/types';
import {
  closeProjectDatabase, createProject, DATABASE_NAME, DATABASE_VERSION, defaultPreferences,
  deleteProject, duplicateProject, getProject, listProjects, loadPreferences, savePreferences,
  saveProject, StorageError,
} from '../src/lib/storage';
import { normalizeHex, PALETTES } from '../src/lib/palettes';

const art: ArtMeta = {
  id: 'moon-garden', title: 'Moon Garden', category: 'Fantasy', difficulty: 'Medium', tags: ['flowers'],
  palette: ['#F4C6D4', '#786CA1'], regionCount: 2, thumbnail: '/thumb.webp', reference: '/ref.svg',
  file: '/art.json', transparent: true, description: 'A moonlit garden.',
};

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

async function clearDatabase() {
  await closeProjectDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database unexpectedly blocked'));
  });
}

async function inspectStores() {
  await closeProjectDatabase();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const result = await new Promise<{ projects: unknown[]; thumbnails: unknown[] }>((resolve, reject) => {
    const tx = db.transaction(['projects', 'thumbnails']);
    const projects = tx.objectStore('projects').getAll();
    const thumbnails = tx.objectStore('thumbnails').getAll();
    tx.oncomplete = () => resolve({ projects: projects.result, thumbnails: thumbnails.result });
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  return result;
}

beforeEach(async () => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  await clearDatabase();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDatabase();
  vi.unstubAllGlobals();
});

describe('offline editable artwork storage', () => {
  it('starts independent attempts without altering source artwork', () => {
    const first = createProject(art, 'number');
    const second = createProject(art, 'free');
    expect(first.id).not.toBe(second.id);
    expect(first.state).toEqual({ fills: {}, strokes: [], shading: true });
    expect(first.mode).toBe('number');
    first.state.fills.face = { color: '#FED0BE' };
    expect(second.state.fills).toEqual({});
    expect(art.palette).toEqual(['#F4C6D4', '#786CA1']);
  });

  it('restores fills, gradients, pressure, clipping and shading after reopening storage', async () => {
    const project = createProject(art, 'shade');
    project.state = {
      fills: { face: { color: '#FED0BE' }, hair: { color: '#786CA1', secondary: '#BEB2DF', angle: 37 } },
      shading: false,
      strokes: [{ id: 'stroke-1', tool: 'airbrush', color: '#AB78CD', size: 17, opacity: 0.35,
        regionId: 'hair', points: [{ x: 32.25, y: 77.5, pressure: 0.7 }, { x: 35, y: 80, pressure: 1 }] }],
    };
    project.thumbnail = new Blob(['preview'], { type: 'image/png' });
    project.progress = 0.5;
    await saveProject(project);
    await closeProjectDatabase();
    const restored = await getProject(project.id);
    expect(restored?.state).toEqual(project.state);
    expect(restored?.mode).toBe('shade');
    expect(restored?.progress).toBe(0.5);
    expect(await restored?.thumbnail?.text()).toBe('preview');
    const raw = await inspectStores();
    expect(raw.projects[0]).toHaveProperty('schemaVersion', DATABASE_VERSION);
    expect(raw.projects[0]).not.toHaveProperty('thumbnail');
    expect(raw.thumbnails).toHaveLength(1);
  });

  it('snapshots queued saves so later pointer input cannot mutate already queued work', async () => {
    const project = createProject(art, 'free');
    project.state.fills.face = { color: '#FED0BE' };
    const writing = saveProject(project);
    project.state.fills.face.color = '#000000';
    await writing;
    expect((await getProject(project.id))?.state.fills.face.color).toBe('#FED0BE');
  });

  it('orders the gallery by most recent work and retains previews on state-only saves', async () => {
    const first = { ...createProject(art, 'free'), updatedAt: 20, thumbnail: new Blob(['first']) };
    const second = { ...createProject(art, 'free'), updatedAt: 30 };
    await saveProject(first);
    await saveProject(second);
    const { thumbnail: _thumb, ...edited } = first;
    await saveProject({ ...edited, updatedAt: 40 });
    const gallery = await listProjects();
    expect(gallery.map(project => project.id)).toEqual([first.id, second.id]);
    expect(await gallery[0].thumbnail?.text()).toBe('first');
  });

  it('duplicates editable content independently and deletes both data and thumbnail atomically', async () => {
    const original = createProject(art, 'free');
    original.state.fills.face = { color: '#FED0BE' };
    original.thumbnail = new Blob(['preview']);
    await saveProject(original);
    const copy = await duplicateProject(original.id);
    copy.state.fills.face.color = '#AAFFBB';
    await saveProject(copy);
    expect((await getProject(original.id))?.state.fills.face.color).toBe('#FED0BE');
    expect(copy.name).toBe('Moon Garden · copy');
    await deleteProject(original.id);
    expect(await getProject(original.id)).toBeUndefined();
    expect((await listProjects()).map(project => project.id)).toEqual([copy.id]);
    const raw = await inspectStores();
    expect(raw.projects).toHaveLength(1);
    expect(raw.thumbnails).toHaveLength(1);
  });

  it('rejects invalid edits without replacing a previously saved drawing', async () => {
    const project = createProject(art, 'free');
    await saveProject(project);
    project.state.fills.face = { color: 'broken' };
    await expect(saveProject(project)).rejects.toBeInstanceOf(StorageError);
    expect((await getProject(project.id))?.state.fills).toEqual({});
  });

  it('rolls back the editable state if writing its thumbnail fails synchronously', async () => {
    const project = createProject(art, 'free');
    project.thumbnail = new Blob(['old']);
    await saveProject(project);
    const originalPut = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === 'thumbnails') throw new DOMException('Simulated full storage', 'QuotaExceededError');
      return originalPut.apply(this, args);
    });
    project.state.fills.face = { color: '#FED0BE' };
    project.thumbnail = new Blob(['new']);
    await expect(saveProject(project)).rejects.toThrow('could not be saved');
    vi.restoreAllMocks();
    const restored = await getProject(project.id);
    expect(restored?.state.fills).toEqual({});
    expect(await restored?.thumbnail?.text()).toBe('old');
  });

  it('migrates legacy inline previews and string fills without losing original content', async () => {
    const old = createProject(art, 'number');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put({ ...old, state: { fills: { face: '#FED0BE' }, strokes: [] }, thumbnail: new Blob(['legacy']) });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    const migrated = await getProject(old.id);
    expect(migrated?.state).toEqual({ fills: { face: { color: '#FED0BE' } }, strokes: [], shading: true });
    expect(await migrated?.thumbnail?.text()).toBe('legacy');
    await saveProject(migrated!);
    const raw = await inspectStores();
    expect(raw.projects[0]).toHaveProperty('schemaVersion', 2);
    expect(raw.projects[0]).not.toHaveProperty('thumbnail');
  });

  it('returns a useful failure for a missing duplicate source', async () => {
    await expect(duplicateProject('missing')).rejects.toThrow('no longer in your gallery');
  });
});

describe('preferences and palettes', () => {
  it('returns defaults only when no preferences are saved', () => {
    expect(loadPreferences()).toEqual(defaultPreferences());
    savePreferences({ theme: 'dark', favorites: ['one', 'one'], swatches: ['#aaccff'],
      customPalettes: [{ name: 'My moon', colors: ['#8e73ca', '#ffffff'] }] });
    expect(loadPreferences()).toEqual({ theme: 'dark', favorites: ['one'], swatches: ['#AACCFF'],
      customPalettes: [{ name: 'My moon', colors: ['#8E73CA', '#FFFFFF'] }] });
  });

  it('does not reset malformed stored preferences or hide quota failures', () => {
    localStorage.setItem('hoshii.preferences.v1', '{broken');
    expect(() => loadPreferences()).toThrow(StorageError);
    expect(localStorage.getItem('hoshii.preferences.v1')).toBe('{broken');
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(() => savePreferences(defaultPreferences())).toThrow('could not be saved');
  });

  it('contains valid coordinated palettes and accepts full or abbreviated HEX input', () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(8);
    for (const palette of PALETTES) {
      expect(palette.colors.length).toBeGreaterThanOrEqual(9);
      expect(palette.colors.every(color => /^#[\dA-F]{6}$/.test(color))).toBe(true);
    }
    expect(normalizeHex('abc')).toBe('#AABBCC');
    expect(normalizeHex(' #8e73ca ')).toBe('#8E73CA');
    expect(normalizeHex('xyz')).toBeUndefined();
  });
});
