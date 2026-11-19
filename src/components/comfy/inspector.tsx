import { useState } from "react";
import { SourceField } from "@/components/comfy/source-field";
import { Btn, controlClass, Field, Select } from "@/components/studio/ui";
import { compileGraph } from "@/lib/comfy/compile";
import { useDesk } from "@/lib/comfy/store";

export function Inspector() {
  const project = useDesk((state) => state.projects.find((item) => item.id === state.activeProjectId) ?? null);
  const draft = useDesk((state) => state.draft);
  const selectedNodeId = useDesk((state) => state.selectedNodeId);
  const setHost = useDesk((state) => state.setHost);
  const renameNode = useDesk((state) => state.renameNode);
  const updateWidget = useDesk((state) => state.updateWidget);
  const deleteNode = useDesk((state) => state.deleteNode);
  const removeLink = useDesk((state) => state.removeLink);
  const checkHost = useDesk((state) => state.checkHost);
  const queueGraph = useDesk((state) => state.queueGraph);
  const names = useDesk((state) => state.sourceNames);
  const [copied, setCopied] = useState(false);

  if (!project || !draft) {
    return <p className="p-4 text-sm text-stone">Open a project to set the ComfyUI address and edit a node.</p>;
  }

  const node = draft.nodes.find((item) => item.id === selectedNodeId) ?? null;
  const wires = node ? draft.links.filter((link) => link.to === node.id || link.from === node.id) : [];
  const json = JSON.stringify(compileGraph(draft, names), null, 2);

  async function copyGraph() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function downloadGraph() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft?.title || "graph"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <Field label="ComfyUI address">
        <input value={project.host} onChange={(event) => setHost(event.target.value)} aria-label="ComfyUI address" className={controlClass} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => void checkHost()}>Check</Btn>
        <Btn tone="solid" onClick={() => void queueGraph()}>
          Queue
        </Btn>
        <Btn onClick={() => void copyGraph()}>{copied ? "Copied" : "Copy graph"}</Btn>
        <Btn onClick={downloadGraph}>Download</Btn>
      </div>
      <p className="text-xs text-mist">Filenames have to match the files in that ComfyUI install. Queue runs there, not in this desk.</p>
      {node ? (
        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <Field label="Node title">
            <input value={node.title} onChange={(event) => renameNode(node.id, event.target.value)} aria-label="Node title" className={controlClass} />
          </Field>
          <p className="text-xs text-mist">{node.type}</p>
          {node.widgets.map((widget) => (
            <Field key={widget.key} label={widget.label}>
              {widget.kind === "image" ? (
                <SourceField nodeId={node.id} />
              ) : widget.kind === "select" ? (
                <Select
                  aria-label={widget.label}
                  value={String(widget.value)}
                  onChange={(event) => updateWidget(node.id, widget.key, event.target.value)}
                >
                  {(widget.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : widget.kind === "text" && widget.key === "text" ? (
                <textarea
                  value={String(widget.value)}
                  onChange={(event) => updateWidget(node.id, widget.key, event.target.value)}
                  aria-label={widget.label}
                  rows={4}
                  className={`${controlClass} h-auto py-2`}
                />
              ) : (
                <input
                  value={String(widget.value)}
                  onChange={(event) => {
                    if (widget.kind === "number") {
                      const next = Number(event.target.value);
                      if (!Number.isNaN(next)) updateWidget(node.id, widget.key, next);
                      return;
                    }
                    updateWidget(node.id, widget.key, event.target.value);
                  }}
                  aria-label={widget.label}
                  inputMode={widget.kind === "number" ? "decimal" : "text"}
                  className={controlClass}
                />
              )}
            </Field>
          ))}
          {widgetSeed(node) ? (
            <Btn onClick={() => updateWidget(node.id, "seed", Math.floor(Math.random() * 1_000_000_000))}>New seed</Btn>
          ) : null}
          {wires.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {wires.map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-2 text-xs text-stone">
                  <span className="truncate">
                    {link.from}:{link.fromPort} → {link.to}:{link.toPort}
                  </span>
                  <Btn tone="text" onClick={() => removeLink(link.id)}>
                    Cut
                  </Btn>
                </li>
              ))}
            </ul>
          ) : null}
          <Btn onClick={() => deleteNode(node.id)}>Remove node</Btn>
        </section>
      ) : (
        <p className="border-t border-line pt-4 text-sm text-stone">Select a node on the board to edit its sockets and values.</p>
      )}
      <details className="border-t border-line pt-4">
        <summary className="cursor-pointer text-sm text-stone">API graph</summary>
        <pre className="mt-2 max-h-64 overflow-auto text-xs text-mist">{json}</pre>
      </details>
    </div>
  );
}

function widgetSeed(node: { widgets: { key: string }[] }) {
  return node.widgets.some((item) => item.key === "seed");
}
