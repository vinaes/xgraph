import type { XrayNode, XrayEdge } from '@/store/useStore';
import type { Server, ProjectMode } from '@/types';

// ── LocalStorage Keys ──

const AUTOSAVE_KEY = 'xray-graph-autosave';
const RECENT_PROJECTS_KEY = 'xray-graph-recent';
const UI_PREFS_KEY = 'xray-graph-ui-prefs';

// ── Serializable Project State ──

export interface SerializedProject {
  id: string;
  name: string;
  version: string;
  mode: ProjectMode;
  metadata: { createdAt: string; updatedAt: string };
  nodes: XrayNode[];
  edges: XrayEdge[];
  servers: Server[];
}

export interface RecentProject {
  id: string;
  name: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
  mode: ProjectMode;
}

export interface UiPrefs {
  inspectorOpen: boolean;
  paletteOpen: boolean;
}

// ── LocalStorage helpers (safe for private browsing) ──

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

// ── Auto-save ──

export function saveToLocalStorage(project: SerializedProject): boolean {
  const json = JSON.stringify(project);
  return safeSetItem(AUTOSAVE_KEY, json);
}

export function loadFromLocalStorage(): SerializedProject | null {
  const json = safeGetItem(AUTOSAVE_KEY);
  if (!json) return null;

  try {
    return JSON.parse(json) as SerializedProject;
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  safeRemoveItem(AUTOSAVE_KEY);
}

// ── Recent Projects ──

export function getRecentProjects(): RecentProject[] {
  const json = safeGetItem(RECENT_PROJECTS_KEY);
  if (!json) return [];

  try {
    return JSON.parse(json) as RecentProject[];
  } catch {
    return [];
  }
}

export function addRecentProject(project: SerializedProject): void {
  const recents = getRecentProjects();

  const entry: RecentProject = {
    id: project.id,
    name: project.name,
    updatedAt: project.metadata.updatedAt,
    nodeCount: project.nodes.length,
    edgeCount: project.edges.length,
    mode: project.mode,
  };

  // Remove existing entry for same project
  const filtered = recents.filter((r) => r.id !== project.id);

  // Add to front, keep max 5
  const updated = [entry, ...filtered].slice(0, 5);

  safeSetItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
}

// ── UI Preferences ──

export function saveUiPrefs(prefs: UiPrefs): void {
  safeSetItem(UI_PREFS_KEY, JSON.stringify(prefs));
}

export function loadUiPrefs(): UiPrefs | null {
  const json = safeGetItem(UI_PREFS_KEY);
  if (!json) return null;

  try {
    return JSON.parse(json) as UiPrefs;
  } catch {
    return null;
  }
}

// ── Save/Open .xray-graph files ──

export function serializeProject(project: SerializedProject): string {
  return JSON.stringify(project, null, 2);
}

export function downloadProjectFile(project: SerializedProject): void {
  const json = serializeProject(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `${safeName}.xray-graph`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openProjectFile(): Promise<SerializedProject | null> {
  // Try File System Access API first
  if ('showOpenFilePicker' in window) {
    try {
      const handles = await (window as unknown as {
        showOpenFilePicker: (opts: {
          types: Array<{ description: string; accept: Record<string, string[]> }>;
          multiple: boolean;
        }) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [
          {
            description: 'Xray Graph Project',
            accept: { 'application/json': ['.xray-graph', '.json'] },
          },
        ],
        multiple: false,
      });
      const handle = handles[0];
      if (!handle) return null;
      const file = await handle.getFile();
      const text = await file.text();
      return JSON.parse(text) as SerializedProject;
    } catch {
      // User cancelled or API error
      return null;
    }
  }

  // Fallback: file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xray-graph,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        resolve(JSON.parse(text) as SerializedProject);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

export async function saveProjectFile(project: SerializedProject): Promise<boolean> {
  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: {
          suggestedName: string;
          types: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: `${safeName}.xray-graph`,
        types: [
          {
            description: 'Xray Graph Project',
            accept: { 'application/json': ['.xray-graph'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(serializeProject(project));
      await writable.close();
      return true;
    } catch {
      // User cancelled
      return false;
    }
  }

  // Fallback: download
  downloadProjectFile(project);
  return true;
}
