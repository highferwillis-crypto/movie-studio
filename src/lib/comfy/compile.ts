import type { Draft, GraphNode } from "./types";

export type ComfyPrompt = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

function widgetValue(node: GraphNode, key: string, names: Record<string, string>): unknown {
  const widget = node.widgets.find((item) => item.key === key);
  if (!widget) return undefined;
  if (key === "lossless") return widget.value === "true" || widget.value === 1;
  if (widget.kind === "image") {
    const id = String(widget.value);
    return names[id] || "";
  }
  return widget.value;
}

export function compileGraph(draft: Draft, names: Record<string, string> = {}): ComfyPrompt {
  const prompt: ComfyPrompt = {};
  for (const node of draft.nodes) {
    const inputs: Record<string, unknown> = {};
    for (const widget of node.widgets) inputs[widget.key] = widgetValue(node, widget.key, names);
    for (const port of node.inputs) {
      const wire = draft.links.find((link) => link.to === node.id && link.toPort === port.name);
      if (!wire) continue;
      const source = draft.nodes.find((item) => item.id === wire.from);
      if (!source) continue;
      const slot = source.outputs.findIndex((item) => item.name === wire.fromPort);
      if (slot < 0) continue;
      inputs[port.name] = [wire.from, slot];
    }
    prompt[node.id] = { class_type: node.type, inputs };
  }
  return prompt;
}

export function positiveText(draft: Draft): string {
  const node = draft.nodes.find((item) => item.title === "Positive");
  const value = node?.widgets.find((item) => item.key === "text")?.value;
  return typeof value === "string" ? value : "";
}

export function widgetNumber(draft: Draft, type: string, key: string): number | null {
  const node = draft.nodes.find((item) => item.type === type);
  const value = node?.widgets.find((item) => item.key === key)?.value;
  return typeof value === "number" ? value : null;
}

export function commandLine(draft: Draft): string {
  const sampler = draft.nodes.find((item) => item.type === "KSampler");
  const steps = sampler?.widgets.find((item) => item.key === "steps")?.value ?? "–";
  const cfg = sampler?.widgets.find((item) => item.key === "cfg")?.value ?? "–";
  const seed = sampler?.widgets.find((item) => item.key === "seed")?.value ?? "–";
  const latent = draft.nodes.find(
    (item) => item.type === "EmptySD3LatentImage" || item.type === "EmptyHunyuanLatentVideo" || item.type === "WanImageToVideo",
  );
  const width = latent?.widgets.find((item) => item.key === "width")?.value ?? "–";
  const height = latent?.widgets.find((item) => item.key === "height")?.value ?? "–";
  const frames = latent?.widgets.find((item) => item.key === "length")?.value;
  const model =
    draft.nodes.find((item) => item.type === "CheckpointLoaderSimple")?.widgets.find((item) => item.key === "ckpt_name")?.value ??
    draft.nodes.find((item) => item.type === "UNETLoader")?.widgets.find((item) => item.key === "unet_name")?.value ??
    draft.kind;
  const frameBit = typeof frames === "number" ? ` · ${frames} frames` : "";
  const sourceBit = draft.nodes.some((item) => item.type === "LoadImage") ? " · from image" : "";
  return `${model} · ${width}×${height}${frameBit}${sourceBit} · ${steps} steps · cfg ${cfg} · seed ${seed}`;
}
