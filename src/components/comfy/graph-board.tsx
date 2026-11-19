import { useRef, useState } from "react";
import type { GraphNode, PortKind } from "@/lib/comfy/types";
import { useDesk } from "@/lib/comfy/store";

const NODE_W = 224;

type Arm = { nodeId: string; name: string; kind: PortKind };

function portY(index: number) {
  return 44 + index * 44 + 22;
}

export function GraphBoard() {
  const draft = useDesk((state) => state.draft);
  const selectedNodeId = useDesk((state) => state.selectedNodeId);
  const selectNode = useDesk((state) => state.selectNode);
  const moveNode = useDesk((state) => state.moveNode);
  const addLink = useDesk((state) => state.addLink);
  const persist = useDesk((state) => state.persist);
  const sourceNames = useDesk((state) => state.sourceNames);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const [arm, setArm] = useState<Arm | null>(null);
  const [hint, setHint] = useState("");

  if (!draft) return null;

  const width = Math.max(1280, ...draft.nodes.map((node) => node.x + NODE_W + 80));
  const height = Math.max(760, ...draft.nodes.map((node) => node.y + 44 + Math.max(node.inputs.length, node.outputs.length, 1) * 44 + 36));

  function point(node: GraphNode, name: string, dir: "in" | "out") {
    const list = dir === "out" ? node.outputs : node.inputs;
    const index = list.findIndex((port) => port.name === name);
    return { x: node.x + (dir === "out" ? NODE_W : 0), y: node.y + portY(Math.max(0, index)) };
  }

  function onPort(node: GraphNode, dir: "in" | "out", name: string, kind: PortKind) {
    if (dir === "out") {
      setArm({ nodeId: node.id, name, kind });
      setHint(`Wire ${kind} into a matching input.`);
      return;
    }
    if (!arm) {
      setHint("Pick an output first.");
      return;
    }
    if (arm.nodeId === node.id) return;
    if (arm.kind !== kind) {
      setHint("Those sockets do not match.");
      return;
    }
    addLink(arm.nodeId, arm.name, node.id, name);
    setArm(null);
    setHint("");
  }

  return (
    <div
      ref={boardRef}
      className="relative min-h-0 flex-1 overflow-auto bg-bg"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.board === "grid") {
          selectNode(null);
          setArm(null);
        }
      }}
    >
      <div className="relative" style={{ width, height }} data-board="grid">
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-stone" aria-hidden="true">
          {draft.links.map((link) => {
            const from = draft.nodes.find((node) => node.id === link.from);
            const to = draft.nodes.find((node) => node.id === link.to);
            if (!from || !to) return null;
            const start = point(from, link.fromPort, "out");
            const end = point(to, link.toPort, "in");
            const bend = Math.max(48, (end.x - start.x) / 2);
            return (
              <path
                key={link.id}
                d={`M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
        {draft.nodes.map((node) => {
          const rows = Math.max(node.inputs.length, node.outputs.length, 1);
          const imageId = node.widgets.find((item) => item.kind === "image")?.value;
          const summary = imageId !== undefined ? sourceNames[String(imageId)] || "No image" : node.widgets.find((item) => item.kind === "text")?.value;
          return (
            <article
              key={node.id}
              className={`absolute w-56 border bg-panel ${selectedNodeId === node.id || arm?.nodeId === node.id ? "border-bone" : "border-line"}`}
              style={{ left: node.x, top: node.y }}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("[data-port]")) return;
                selectNode(node.id);
                const board = boardRef.current;
                if (!board) return;
                const rect = board.getBoundingClientRect();
                drag.current = {
                  id: node.id,
                  ox: event.clientX - rect.left + board.scrollLeft - node.x,
                  oy: event.clientY - rect.top + board.scrollTop - node.y,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!drag.current || drag.current.id !== node.id) return;
                const board = boardRef.current;
                if (!board) return;
                const rect = board.getBoundingClientRect();
                moveNode(
                  node.id,
                  event.clientX - rect.left + board.scrollLeft - drag.current.ox,
                  event.clientY - rect.top + board.scrollTop - drag.current.oy,
                );
              }}
              onPointerUp={() => {
                drag.current = null;
                persist();
              }}
            >
              <header className="flex h-11 cursor-grab items-center justify-between gap-2 border-b border-line bg-ink px-3">
                <span className="truncate text-sm font-medium text-bone">{node.title}</span>
                <span className="truncate text-xs text-mist">{node.type}</span>
              </header>
              <div className="relative" style={{ height: rows * 44 }}>
                {node.inputs.map((port, index) => (
                  <button
                    key={port.name}
                    type="button"
                    data-port="in"
                    onClick={() => onPort(node, "in", port.name, port.kind)}
                    className="absolute left-0 flex h-11 max-w-28 items-center gap-1 px-2 text-xs text-stone"
                    style={{ top: index * 44 }}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-stone" />
                    <span className="truncate">{port.name}</span>
                  </button>
                ))}
                {node.outputs.map((port, index) => (
                  <button
                    key={port.name}
                    type="button"
                    data-port="out"
                    onClick={() => onPort(node, "out", port.name, port.kind)}
                    className="absolute right-0 flex h-11 max-w-28 items-center justify-end gap-1 px-2 text-xs text-stone"
                    style={{ top: index * 44 }}
                  >
                    <span className="truncate">{port.name}</span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${arm?.nodeId === node.id && arm.name === port.name ? "bg-bone" : "bg-stone"}`} />
                  </button>
                ))}
              </div>
              {summary ? <p className="truncate border-t border-line px-3 py-2 text-xs text-mist">{String(summary)}</p> : null}
            </article>
          );
        })}
      </div>
      {hint ? <p className="sticky bottom-0 border-t border-line bg-ink px-3 py-2 text-xs text-stone">{hint}</p> : null}
    </div>
  );
}
