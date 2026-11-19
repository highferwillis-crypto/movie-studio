import { create } from "zustand";
import { fluxImage, fluxStill, NODE_TEMPLATES, wanImage, wanShot } from "./catalog";
import { getImage, putImage, safeImageName } from "./images";
import type { Draft, GraphLink, Note, Pane, Project, Widget, Workflow } from "./types";

const KEY = "comfy-desk-v1";

export type PresetName = "flux" | "flux-image" | "wan" | "wan-image";

type Persisted = {
  projects: Project[];
  workflows: Workflow[];
  notes: Note[];
  activeProjectId: string | null;
  draft: Draft | null;
  sourceNames: Record<string, string>;
};

type DeskState = Persisted & {
  ready: boolean;
  selectedNodeId: string | null;
  pane: Pane;
  message: string;
  messageTone: "ok" | "bad";
  load: () => void;
  createProject: (title: string) => void;
  selectProject: (id: string | null) => void;
  setHost: (host: string) => void;
  loadPreset: (preset: PresetName) => void;
  setSource: (file: File, nodeId?: string) => Promise<void>;
  openWorkflow: (id: string) => void;
  saveWorkflow: (title: string) => void;
  deleteWorkflow: (id: string) => void;
  saveNote: (title: string, body: string, id?: string) => void;
  deleteNote: (id: string) => void;
  selectNode: (id: string | null) => void;
  moveNode: (id: string, x: number, y: number) => void;
  renameNode: (id: string, title: string) => void;
  updateWidget: (id: string, key: string, value: string | number) => void;
  setPositive: (text: string) => void;
  setSampler: (key: string, value: number) => void;
  setLatent: (key: string, value: number) => void;
  addNode: (type: string) => void;
  deleteNode: (id: string) => void;
  addLink: (from: string, fromPort: string, to: string, toPort: string) => void;
  removeLink: (id: string) => void;
  setPane: (pane: Pane) => void;
  persist: () => void;
  checkHost: () => Promise<void>;
  queueGraph: () => Promise<void>;
};

function read(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function write(state: Persisted) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      projects: state.projects,
      workflows: state.workflows,
      notes: state.notes,
      activeProjectId: state.activeProjectId,
      draft: state.draft,
      sourceNames: state.sourceNames,
    }),
  );
}

function withGraph(draft: Draft, nodes: Draft["nodes"], links: GraphLink[] = draft.links): Draft {
  return { ...draft, nodes, links };
}

export const useDesk = create<DeskState>((set, get) => ({
  ready: false,
  projects: [],
  workflows: [],
  notes: [],
  activeProjectId: null,
  draft: null,
  sourceNames: {},
  selectedNodeId: null,
  pane: "graph",
  message: "",
  messageTone: "ok",

  load: () => {
    const saved = read();
    if (!saved) {
      set({ ready: true });
      return;
    }
    set({ ...saved, sourceNames: saved.sourceNames ?? {}, ready: true, draft: saved.draft ?? null });
  },

  createProject: (title) => {
    const name = title.trim();
    if (!name) return;
    const project: Project = {
      id: crypto.randomUUID(),
      title: name,
      host: "http://127.0.0.1:8188",
      createdAt: Date.now(),
    };
    const next = {
      projects: [project, ...get().projects],
      activeProjectId: project.id,
      draft: fluxStill(),
      selectedNodeId: "2",
      message: "",
    };
    set(next);
    write({ ...get(), ...next });
  },

  selectProject: (id) => {
    if (!id) {
      set({ activeProjectId: null, draft: null, selectedNodeId: null });
      write(get());
      return;
    }
    const latest = get()
      .workflows.filter((item) => item.projectId === id)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const draft: Draft = latest
      ? { savedId: latest.id, title: latest.title, kind: latest.kind, nodes: latest.nodes, links: latest.links }
      : fluxStill();
    set({ activeProjectId: id, draft, selectedNodeId: draft.nodes.find((node) => node.title === "Positive")?.id ?? null, message: "" });
    write(get());
  },

  setHost: (host) => {
    const id = get().activeProjectId;
    if (!id) return;
    const projects = get().projects.map((project) => (project.id === id ? { ...project, host } : project));
    set({ projects });
    write(get());
  },

  loadPreset: (preset) => {
    const draft =
      preset === "wan" ? wanShot() : preset === "wan-image" ? wanImage() : preset === "flux-image" ? fluxImage() : fluxStill();
    const selected = draft.nodes.find((node) => node.type === "LoadImage")?.id ?? draft.nodes.find((node) => node.title === "Positive")?.id ?? null;
    set({ draft, selectedNodeId: selected, message: "" });
    write(get());
  },

  setSource: async (file, nodeId) => {
    const draft = get().draft;
    if (!draft) return;
    const target = draft.nodes.find((node) => node.id === nodeId && node.type === "LoadImage") ?? draft.nodes.find((node) => node.type === "LoadImage");
    if (!target) return;
    const id = crypto.randomUUID();
    await putImage(id, file);
    const nodes = draft.nodes.map((node) =>
      node.id === target.id ? { ...node, widgets: node.widgets.map((item) => (item.key === "image" ? { ...item, value: id } : item)) } : node,
    );
    const next = withGraph(draft, nodes);
    const sourceNames = { ...get().sourceNames, [id]: safeImageName(file.name) };
    set({ draft: next, sourceNames, message: "" });
    write({ ...get(), draft: next, sourceNames });
  },

  openWorkflow: (id) => {
    const workflow = get().workflows.find((item) => item.id === id);
    if (!workflow) return;
    set({
      draft: {
        savedId: workflow.id,
        title: workflow.title,
        kind: workflow.kind,
        nodes: structuredClone(workflow.nodes),
        links: structuredClone(workflow.links),
      },
      selectedNodeId: workflow.nodes.find((node) => node.title === "Positive")?.id ?? null,
      pane: "graph",
      message: "",
    });
    write(get());
  },

  saveWorkflow: (title) => {
    const { draft, activeProjectId, workflows } = get();
    const name = title.trim();
    if (!draft || !activeProjectId || !name) return;
    const now = Date.now();
    if (draft.savedId && workflows.some((item) => item.id === draft.savedId)) {
      const next = workflows.map((item) =>
        item.id === draft.savedId ? { ...item, ...draft, title: name, updatedAt: now, id: item.id, projectId: item.projectId } : item,
      );
      const filed: Draft = { ...draft, title: name, savedId: draft.savedId };
      set({ workflows: next, draft: filed, message: `Filed “${name}”.`, messageTone: "ok" });
    } else {
      const id = crypto.randomUUID();
      const workflow: Workflow = { ...draft, id, projectId: activeProjectId, title: name, savedId: id, updatedAt: now };
      set({
        workflows: [workflow, ...workflows],
        draft: { ...draft, title: name, savedId: id },
        message: `Filed “${name}”.`,
        messageTone: "ok",
      });
    }
    write(get());
  },

  deleteWorkflow: (id) => {
    const draft = get().draft;
    set({
      workflows: get().workflows.filter((item) => item.id !== id),
      draft: draft?.savedId === id ? { ...draft, savedId: null } : draft,
    });
    write(get());
  },

  saveNote: (title, body, id) => {
    const projectId = get().activeProjectId;
    const name = title.trim();
    if (!projectId || !name) return;
    const now = Date.now();
    const notes = id
      ? get().notes.map((note) => (note.id === id ? { ...note, title: name, body, updatedAt: now } : note))
      : [{ id: crypto.randomUUID(), projectId, title: name, body, updatedAt: now }, ...get().notes];
    set({ notes, message: `Note “${name}” filed.`, messageTone: "ok" });
    write(get());
  },

  deleteNote: (id) => {
    set({ notes: get().notes.filter((note) => note.id !== id) });
    write(get());
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  moveNode: (id, x, y) => {
    const draft = get().draft;
    if (!draft) return;
    const nodes = draft.nodes.map((node) => (node.id === id ? { ...node, x: Math.max(0, x), y: Math.max(0, y) } : node));
    set({ draft: { ...draft, nodes } });
  },

  renameNode: (id, title) => {
    const draft = get().draft;
    if (!draft) return;
    const nodes = draft.nodes.map((node) => (node.id === id ? { ...node, title } : node));
    const next = withGraph(draft, nodes);
    set({ draft: next });
    write({ ...get(), draft: next });
  },

  updateWidget: (id, key, value) => {
    const draft = get().draft;
    if (!draft) return;
    const nodes = draft.nodes.map((node) =>
      node.id === id ? { ...node, widgets: node.widgets.map((item) => (item.key === key ? { ...item, value } : item)) } : node,
    );
    const next = withGraph(draft, nodes);
    set({ draft: next });
    write({ ...get(), draft: next });
  },

  setPositive: (text) => {
    const draft = get().draft;
    if (!draft) return;
    const nodes = draft.nodes.map((node) =>
      node.title === "Positive" ? { ...node, widgets: node.widgets.map((item) => (item.key === "text" ? { ...item, value: text } : item)) } : node,
    );
    const next = withGraph(draft, nodes);
    set({ draft: next });
    write({ ...get(), draft: next });
  },

  setSampler: (key, value) => {
    const draft = get().draft;
    if (!draft) return;
    const nodes = draft.nodes.map((node) =>
      node.type === "KSampler" ? { ...node, widgets: node.widgets.map((item) => (item.key === key ? { ...item, value } : item)) } : node,
    );
    const next = withGraph(draft, nodes);
    set({ draft: next });
    write({ ...get(), draft: next });
  },

  setLatent: (key, value) => {
    const draft = get().draft;
    if (!draft) return;
    const nodes = draft.nodes.map((node) =>
      node.type === "EmptySD3LatentImage" || node.type === "EmptyHunyuanLatentVideo" || node.type === "WanImageToVideo"
        ? { ...node, widgets: node.widgets.map((item) => (item.key === key ? { ...item, value } : item)) }
        : node,
    );
    const next = withGraph(draft, nodes);
    set({ draft: next });
    write({ ...get(), draft: next });
  },

  addNode: (type) => {
    const draft = get().draft;
    const template = NODE_TEMPLATES.find((item) => item.type === type);
    if (!draft || !template) return;
    const id = String(draft.nodes.reduce((max, node) => Math.max(max, Number(node.id) || 0), 0) + 1);
    const offset = draft.nodes.length * 28;
    const built = template.build(id, 48 + offset, 48 + offset);
    const next = withGraph(draft, [...draft.nodes, built]);
    set({ draft: next, selectedNodeId: id, pane: "node" });
    write({ ...get(), draft: next });
  },

  deleteNode: (id) => {
    const draft = get().draft;
    if (!draft) return;
    const next = withGraph(
      draft,
      draft.nodes.filter((node) => node.id !== id),
      draft.links.filter((link) => link.from !== id && link.to !== id),
    );
    set({ draft: next, selectedNodeId: null });
    write({ ...get(), draft: next });
  },

  addLink: (from, fromPort, to, toPort) => {
    const draft = get().draft;
    if (!draft) return;
    const links = [
      ...draft.links.filter((link) => !(link.to === to && link.toPort === toPort)),
      { id: crypto.randomUUID(), from, fromPort, to, toPort },
    ];
    const next = withGraph(draft, draft.nodes, links);
    set({ draft: next, message: "" });
    write({ ...get(), draft: next });
  },

  removeLink: (id) => {
    const draft = get().draft;
    if (!draft) return;
    const next = withGraph(draft, draft.nodes, draft.links.filter((link) => link.id !== id));
    set({ draft: next });
    write({ ...get(), draft: next });
  },

  setPane: (pane) => set({ pane }),
  persist: () => write(get()),

  checkHost: async () => {
    const project = get().projects.find((item) => item.id === get().activeProjectId);
    if (!project) return;
    set({ message: "Checking ComfyUI…", messageTone: "ok" });
    try {
      const res = await fetch(`${project.host.replace(/\/$/, "")}/system_stats`, { mode: "cors" });
      if (!res.ok) throw new Error(String(res.status));
      set({ message: "ComfyUI answered.", messageTone: "ok" });
    } catch {
      set({
        message: "ComfyUI did not answer. It has to be running on this machine, with cross-origin access open.",
        messageTone: "bad",
      });
    }
  },

  queueGraph: async () => {
    const project = get().projects.find((item) => item.id === get().activeProjectId);
    const draft = get().draft;
    if (!project || !draft) return;
    const { compileGraph } = await import("./compile");
    const missing = draft.nodes.some(
      (node) => node.type === "LoadImage" && !String(node.widgets.find((item) => item.key === "image")?.value ?? ""),
    );
    if (missing) {
      set({ message: "Choose a source image first.", messageTone: "bad" });
      return;
    }
    set({ message: "Queuing…", messageTone: "ok" });
    try {
      const names = { ...get().sourceNames };
      const host = project.host.replace(/\/$/, "");
      for (const node of draft.nodes.filter((item) => item.type === "LoadImage")) {
        const id = String(node.widgets.find((item) => item.key === "image")?.value ?? "");
        const blob = await getImage(id);
        if (!blob) {
          set({ message: "That source image is no longer stored. Choose it again.", messageTone: "bad" });
          return;
        }
        const form = new FormData();
        form.append("image", blob, names[id] || "source.png");
        form.append("overwrite", "true");
        const uploaded = await fetch(`${host}/upload/image`, { method: "POST", mode: "cors", body: form });
        if (!uploaded.ok) {
          set({ message: "ComfyUI refused the source image.", messageTone: "bad" });
          return;
        }
        const saved = (await uploaded.json().catch(() => null)) as { name?: string } | null;
        if (saved?.name) names[id] = saved.name;
      }
      const res = await fetch(`${host}/prompt`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: compileGraph(draft, names) }),
      });
      const body = (await res.json().catch(() => null)) as { prompt_id?: string; error?: unknown } | null;
      if (!res.ok) {
        const reason = body?.error ? JSON.stringify(body.error) : `ComfyUI refused the graph (${res.status}).`;
        set({ message: reason, messageTone: "bad" });
        return;
      }
      set({ message: body?.prompt_id ? `Queued ${body.prompt_id}.` : "Queued.", messageTone: "ok" });
    } catch {
      set({
        message: "Could not reach ComfyUI. The graph is still here — copy it and run it from your install.",
        messageTone: "bad",
      });
    }
  },
}));

export function widgetOf(node: { widgets: Widget[] }, key: string) {
  return node.widgets.find((item) => item.key === key);
}
