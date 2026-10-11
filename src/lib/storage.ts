import type { ArtMeta, BrushStroke, ColoringMode, ColoringState, Fill, Project, Tool } from '../types';

export const DATABASE_NAME = 'hoshii-studio';
export const DATABASE_VERSION = 2;
const PREFERENCES_KEY = 'hoshii.preferences.v1';
const SCHEMA_VERSION = 2;

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  favorites: string[];
  swatches: string[];
  customPalettes: Array<{ name: string; colors: string[] }>;
}

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

interface StoredProject extends Omit<Project, 'thumbnail'> { schemaVersion: number }
let connection: Promise<IDBDatabase> | undefined;
const HEX = /^#[\da-f]{6}$/i;
const MODES = new Set<ColoringMode>(['free', 'number', 'shade']);
const TOOLS = new Set<Tool>(['fill', 'brush', 'airbrush', 'pencil', 'gradient', 'sparkle', 'eraser', 'eyedropper']);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function invalid(): never {
  throw new StorageError('This drawing contains unreadable save data. Its original data has been kept.');
}

/** Validate and clone saves at the storage boundary. Never replace damaged saves with empty art. */
function normalizeProject(value: unknown): StoredProject {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.artId !== 'string' ||
      !value.artId || typeof value.name !== 'string' || !finite(value.createdAt) ||
      !finite(value.updatedAt) || !MODES.has(value.mode as ColoringMode) || !record(value.state)) invalid();
  const version = value.schemaVersion ?? 1;
  if (version !== 1 && version !== SCHEMA_VERSION) {
    throw new StorageError('This drawing was saved by an unsupported app version. Update Hoshii to open it.');
  }
  const source = value.state;
  if (!record(source.fills) || !Array.isArray(source.strokes) ||
      (source.shading !== undefined && typeof source.shading !== 'boolean')) invalid();
  const fills: Record<string, Fill> = Object.create(null) as Record<string, Fill>;
  for (const [id, raw] of Object.entries(source.fills)) {
    // Version 1 stored a plain HEX string for solid fills.
    const fill = typeof raw === 'string' && version === 1 ? { color: raw } : raw;
    if (!record(fill) || typeof fill.color !== 'string' || !HEX.test(fill.color) ||
        (fill.secondary !== undefined && (typeof fill.secondary !== 'string' || !HEX.test(fill.secondary))) ||
        (fill.angle !== undefined && !finite(fill.angle))) invalid();
    fills[id] = {
      color: fill.color,
      ...(fill.secondary === undefined ? {} : { secondary: fill.secondary as string }),
      ...(fill.angle === undefined ? {} : { angle: fill.angle as number }),
    };
  }
  const strokes: BrushStroke[] = source.strokes.map((stroke: unknown) => {
    if (!record(stroke) || typeof stroke.id !== 'string' || !TOOLS.has(stroke.tool as Tool) ||
        typeof stroke.color !== 'string' || !HEX.test(stroke.color) || !finite(stroke.size) ||
        stroke.size <= 0 || !finite(stroke.opacity) || stroke.opacity < 0 || stroke.opacity > 1 ||
        !Array.isArray(stroke.points) || (stroke.regionId !== undefined && typeof stroke.regionId !== 'string')) invalid();
    const points = stroke.points.map((point: unknown) => {
      if (!record(point) || !finite(point.x) || !finite(point.y) || !finite(point.pressure) ||
          point.pressure < 0 || point.pressure > 1) invalid();
      return { x: point.x, y: point.y, pressure: point.pressure };
    });
    return {
      id: stroke.id, tool: stroke.tool as Tool, color: stroke.color, size: stroke.size,
      opacity: stroke.opacity, points,
      ...(stroke.regionId === undefined ? {} : { regionId: stroke.regionId as string }),
    };
  });
  const state: ColoringState = { fills, strokes, shading: source.shading !== false };
  if (value.progress !== undefined && !finite(value.progress)) invalid();
  return {
    schemaVersion: SCHEMA_VERSION, id: value.id, artId: value.artId, name: value.name,
    createdAt: value.createdAt, updatedAt: value.updatedAt, mode: value.mode as ColoringMode,
    progress: Math.max(0, Math.min(1, (value.progress ?? 0) as number)), state,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  if (connection) return connection;
  if (!globalThis.indexedDB) return Promise.reject(new StorageError('Local artwork storage is unavailable on this device.'));
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let rejected = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction!;
      const projects = db.objectStoreNames.contains('projects')
        ? tx.objectStore('projects') : db.createObjectStore('projects', { keyPath: 'id' });
      if (!projects.indexNames.contains('updatedAt')) projects.createIndex('updatedAt', 'updatedAt');
      const thumbnails = db.objectStoreNames.contains('thumbnails')
        ? tx.objectStore('thumbnails') : db.createObjectStore('thumbnails', { keyPath: 'id' });
      // Move v1 inline thumbnails atomically. The editable save itself remains untouched until read.
      const cursor = projects.openCursor();
      cursor.onsuccess = () => {
        const item = cursor.result;
        if (!item) return;
        const old = item.value;
        if (old.thumbnail instanceof Blob) {
          thumbnails.put({ id: old.id, blob: old.thumbnail });
          const { thumbnail: _thumbnail, ...rest } = old;
          item.update(rest);
        }
        item.continue();
      };
    };
    request.onsuccess = () => {
      const db = request.result;
      if (rejected) { db.close(); return; }
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => reject(new StorageError('Could not open your artwork storage.', request.error));
    request.onblocked = () => {
      rejected = true;
      reject(new StorageError('Close other Hoshii tabs, then try saving again.'));
    };
  });
  connection.catch(() => { connection = undefined; });
  return connection;
}

function transactionError(tx: IDBTransaction): StorageError {
  const quota = tx.error?.name === 'QuotaExceededError';
  return new StorageError(quota
    ? 'Your device storage is full. Free some space, then retry saving. Your current drawing is still open.'
    : 'Your artwork could not be saved or loaded. Please retry before closing this drawing.', tx.error);
}

/** Close cleanly before tests or a controlled app-storage upgrade; does not remove any data. */
export async function closeProjectDatabase(): Promise<void> {
  const pending = connection;
  connection = undefined;
  if (pending) (await pending).close();
}

export function createProject(art: ArtMeta, mode: ColoringMode): Project {
  const now = Date.now();
  return {
    id: crypto.randomUUID(), artId: art.id, name: art.title, mode,
    createdAt: now, updatedAt: now, progress: 0,
    state: { fills: {}, strokes: [], shading: true },
  };
}

export async function saveProject(project: Project): Promise<void> {
  // Clone synchronously, before opening IDB, so rapid brush input cannot mutate this write.
  const data = normalizeProject({ ...project, schemaVersion: SCHEMA_VERSION });
  const thumbnail = project.thumbnail;
  if (thumbnail !== undefined && !(thumbnail instanceof Blob)) throw new StorageError('The preview image could not be saved.');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'thumbnails'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(transactionError(tx));
    tx.onerror = () => { /* onabort reports the transaction outcome, not a single request. */ };
    try {
      tx.objectStore('projects').put(data);
      // An absent thumbnail means "keep the last preview", useful while a new one renders.
      if (thumbnail !== undefined) tx.objectStore('thumbnails').put({ id: project.id, blob: thumbnail });
    } catch (error) {
      tx.abort();
      reject(new StorageError('Your artwork could not be saved. Please retry before closing this drawing.', error));
    }
  });
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'thumbnails'], 'readonly');
    const project = tx.objectStore('projects').get(id);
    const thumb = tx.objectStore('thumbnails').get(id);
    tx.onabort = () => reject(transactionError(tx));
    tx.oncomplete = () => {
      try {
        if (!project.result) return resolve(undefined);
        const { schemaVersion: _version, ...data } = normalizeProject(project.result);
        resolve({ ...data, ...(thumb.result ? { thumbnail: thumb.result.blob } : {}) });
      } catch (error) { reject(error); }
    };
  });
}

export async function listProjects(): Promise<Project[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'thumbnails'], 'readonly');
    const projects = tx.objectStore('projects').getAll();
    const thumbnails = tx.objectStore('thumbnails').getAll();
    tx.onabort = () => reject(transactionError(tx));
    tx.oncomplete = () => {
      try {
        const thumbs = new Map<string, Blob>(thumbnails.result.map(t => [t.id, t.blob]));
        const result = projects.result.map(raw => {
          const { schemaVersion: _version, ...data } = normalizeProject(raw);
          const thumbnail = thumbs.get(data.id);
          return { ...data, ...(thumbnail ? { thumbnail } : {}) };
        });
        resolve(result.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (error) { reject(error); }
    };
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'thumbnails'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(transactionError(tx));
    try {
      tx.objectStore('projects').delete(id);
      tx.objectStore('thumbnails').delete(id);
    } catch (error) {
      tx.abort();
      reject(new StorageError('The drawing could not be deleted. Your saved artwork has been kept.', error));
    }
  });
}

export async function duplicateProject(id: string): Promise<Project> {
  const original = await getProject(id);
  if (!original) throw new StorageError('This drawing is no longer in your gallery.');
  const now = Date.now();
  const copy: Project = { ...original, id: crypto.randomUUID(), name: `${original.name} · copy`, createdAt: now, updatedAt: now };
  await saveProject(copy);
  return copy;
}

function normalizePreferences(value: unknown): Preferences {
  if (!record(value) || !['light', 'dark', 'system'].includes(value.theme as string) ||
      !Array.isArray(value.favorites) || !value.favorites.every(x => typeof x === 'string') ||
      !Array.isArray(value.swatches) || !value.swatches.every(x => typeof x === 'string' && HEX.test(x)) ||
      !Array.isArray(value.customPalettes)) throw new StorageError('Your saved settings could not be read. Existing settings have been kept.');
  const customPalettes = value.customPalettes.map((palette: unknown) => {
    if (!record(palette) || typeof palette.name !== 'string' || !Array.isArray(palette.colors) ||
        !palette.colors.every(x => typeof x === 'string' && HEX.test(x))) {
      throw new StorageError('A saved palette contains invalid colors. Existing settings have been kept.');
    }
    return { name: palette.name, colors: (palette.colors as string[]).map(color => color.toUpperCase()) };
  });
  return {
    theme: value.theme as Preferences['theme'], favorites: [...new Set(value.favorites as string[])],
    swatches: [...new Set((value.swatches as string[]).map(color => color.toUpperCase()))], customPalettes,
  };
}

export function defaultPreferences(): Preferences {
  return { theme: 'system', favorites: [], swatches: [], customPalettes: [] };
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw === null ? defaultPreferences() : normalizePreferences(JSON.parse(raw));
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError('Your settings could not be loaded. Please check device storage.', error);
  }
}

export function savePreferences(preferences: Preferences): void {
  const data = normalizePreferences(preferences);
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...data, schemaVersion: 1 })); }
  catch (error) { throw new StorageError('Your settings could not be saved. Please check device storage and retry.', error); }
}

/** Best effort: browser policy may decline persistent storage without affecting IDB availability. */
export async function requestPersistentStorage(): Promise<boolean> {
  try { return await navigator.storage?.persist?.() ?? false; }
  catch { return false; }
}
