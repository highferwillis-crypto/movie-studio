import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GraphBoard } from "@/components/comfy/graph-board";
import { Inspector } from "@/components/comfy/inspector";
import { LibraryPane } from "@/components/comfy/library-pane";
import { SourceField } from "@/components/comfy/source-field";
import { Btn, controlClass, Select } from "@/components/studio/ui";
import { NODE_TEMPLATES } from "@/lib/comfy/catalog";
import { commandLine, positiveText } from "@/lib/comfy/compile";
import { useDesk } from "@/lib/comfy/store";

export function DeskApp() {
  const ready = useDesk((state) => state.ready);
  const load = useDesk((state) => state.load);
  const projects = useDesk((state) => state.projects);
  const activeProjectId = useDesk((state) => state.activeProjectId);
  const createProject = useDesk((state) => state.createProject);
  const selectProject = useDesk((state) => state.selectProject);
  const draft = useDesk((state) => state.draft);
  const loadPreset = useDesk((state) => state.loadPreset);
  const setPositive = useDesk((state) => state.setPositive);
  const setSampler = useDesk((state) => state.setSampler);
  const setLatent = useDesk((state) => state.setLatent);
  const addNode = useDesk((state) => state.addNode);
  const pane = useDesk((state) => state.pane);
  const setPane = useDesk((state) => state.setPane);
  const message = useDesk((state) => state.message);
  const messageTone = useDesk((state) => state.messageTone);
  const [title, setTitle] = useState("");
  const [addType, setAddType] = useState(NODE_TEMPLATES[0]?.type ?? "");

  useEffect(() => {
    load();
  }, [load]);

  const prompt = draft ? positiveText(draft) : "";
  const sampler = draft?.nodes.find((node) => node.type === "KSampler");
  const latent = draft?.nodes.find(
    (node) => node.type === "EmptySD3LatentImage" || node.type === "EmptyHunyuanLatentVideo" || node.type === "WanImageToVideo",
  );
  const source = draft?.nodes.find((node) => node.type === "LoadImage");

  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-bg text-bone">
      <header className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl leading-none tracking-tight">Comfy Desk</h1>
          <p className="mt-1 text-sm text-stone">
            Develop Flux and Wan graphs, then queue them on your ComfyUI.{" "}
            <Link to="/studio" className="text-bone underline-offset-4 hover:underline">
              Movie Studio
            </Link>
          </p>
        </div>
        <form
          className="flex min-w-0 flex-1 gap-2 md:max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            createProject(title);
            setTitle("");
          }}
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="New project title"
            aria-label="New project title"
            className={`${controlClass} min-w-0`}
          />
          <Btn type="submit" tone="solid" className="shrink-0">
            Create project
          </Btn>
        </form>
        <Select aria-label="Open project" value={activeProjectId ?? ""} onChange={(event) => selectProject(event.target.value || null)} className="md:max-w-52">
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </Select>
      </header>
      {message ? (
        <p role="status" className={`px-4 py-2 text-sm ${messageTone === "bad" ? "text-danger" : "text-stone"}`}>
          {message}
        </p>
      ) : null}
      <nav className="flex border-b border-line md:hidden">
        {(
          [
            ["library", "Library"],
            ["graph", "Graph"],
            ["node", "Node"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPane(id)}
            className={`h-11 flex-1 border-b-2 text-sm ${pane === id ? "border-bone font-medium text-bone" : "border-transparent text-mist"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="grid min-h-0 flex-1 md:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <aside className={`${pane === "library" ? "flex" : "hidden"} min-h-0 flex-col border-line md:flex md:border-r`}>
          {ready ? <LibraryPane /> : <p className="p-4 text-sm text-stone">Opening the desk…</p>}
        </aside>
        <main className={`${pane === "graph" ? "flex" : "hidden"} min-h-0 flex-col md:flex`}>
          {draft ? (
            <>
              <div className="flex flex-col gap-2 border-b border-line p-3">
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => loadPreset("flux")}>Flux still</Btn>
                  <Btn onClick={() => loadPreset("flux-image")}>Flux image</Btn>
                  <Btn onClick={() => loadPreset("wan")}>Wan shot</Btn>
                  <Btn onClick={() => loadPreset("wan-image")}>Wan image</Btn>
                  <Select aria-label="Add node" value={addType} onChange={(event) => setAddType(event.target.value)} className="md:max-w-56">
                    {NODE_TEMPLATES.map((template) => (
                      <option key={template.type} value={template.type}>
                        {template.title}
                      </option>
                    ))}
                  </Select>
                  <Btn onClick={() => addNode(addType)}>Add node</Btn>
                </div>
                <textarea
                  value={prompt}
                  onChange={(event) => setPositive(event.target.value)}
                  placeholder="Positive prompt"
                  aria-label="Positive prompt"
                  rows={2}
                  className={`${controlClass} h-auto py-2`}
                />
                {source ? <SourceField nodeId={source.id} /> : null}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {sampler ? (
                    <>
                      <Num label="Steps" value={num(sampler, "steps")} onChange={(value) => setSampler("steps", value)} />
                      <Num label="CFG" value={num(sampler, "cfg")} onChange={(value) => setSampler("cfg", value)} />
                      <Num label="Seed" value={num(sampler, "seed")} onChange={(value) => setSampler("seed", value)} />
                    </>
                  ) : null}
                  {latent ? (
                    <>
                      <Num label="Width" value={num(latent, "width")} onChange={(value) => setLatent("width", value)} />
                      <Num label="Height" value={num(latent, "height")} onChange={(value) => setLatent("height", value)} />
                      {latent.widgets.some((item) => item.key === "length") ? (
                        <Num label="Frames" value={num(latent, "length")} onChange={(value) => setLatent("length", value)} />
                      ) : null}
                    </>
                  ) : null}
                </div>
                <p className="truncate text-xs text-mist">{commandLine(draft)}</p>
              </div>
              <GraphBoard />
            </>
          ) : (
            <p className="p-4 text-sm text-stone">Title a project. A Flux graph opens on the board, ready to rewire.</p>
          )}
        </main>
        <aside className={`${pane === "node" ? "flex" : "hidden"} min-h-0 flex-col border-line md:flex md:border-l`}>
          {ready ? <Inspector /> : null}
        </aside>
      </div>
    </div>
  );
}

function num(node: { widgets: { key: string; value: string | number }[] }, key: string) {
  const value = node.widgets.find((item) => item.key === key)?.value;
  return typeof value === "number" ? value : 0;
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-stone">
      <span>{label}</span>
      <input
        value={String(value)}
        inputMode="decimal"
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        className={controlClass}
      />
    </label>
  );
}
