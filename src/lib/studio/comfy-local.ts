import { frameSize, type StudioSettings } from "@/lib/studio/settings";

type OutFile = { filename: string; subfolder?: string; type?: string };

function basicPrompt(input: {
  prompt: string;
  checkpoint: string;
  width: number;
  height: number;
  batch: number;
  steps: number;
  cfg: number;
  seed: number;
}) {
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: input.checkpoint } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: input.prompt, clip: ["1", 1] } },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: "blurry, watermark, warped anatomy, extra limbs", clip: ["1", 1] },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: input.width, height: input.height, batch_size: input.batch },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed: input.seed,
        steps: input.steps,
        cfg: input.cfg,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { filename_prefix: "studio", images: ["6", 0] } },
  };
}

function filesOf(outputs: Record<string, { images?: OutFile[] }> | undefined): OutFile[] {
  const files: OutFile[] = [];
  for (const node of Object.values(outputs ?? {})) files.push(...(node.images ?? []));
  return files;
}

export async function runLocalCheckpoint(input: {
  settings: StudioSettings;
  prompt: string;
  aspect: string;
  batch: number;
  cancelled: () => boolean;
}): Promise<Blob[]> {
  const host = input.settings.comfyHost.replace(/\/$/, "");
  const checkpoint = input.settings.checkpoint.trim();
  if (!checkpoint) throw new Error("Name the checkpoint file in Settings.");
  const size = frameSize(input.aspect, input.settings.maxSide);
  const queued = await fetch(`${host}/prompt`, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: basicPrompt({
        prompt: input.prompt,
        checkpoint,
        width: size.width,
        height: size.height,
        batch: input.batch,
        steps: input.settings.steps,
        cfg: input.settings.cfg,
        seed: Math.floor(Math.random() * 1_000_000_000),
      }),
    }),
  }).catch(() => null);
  if (!queued) {
    throw new Error("Could not reach ComfyUI. Start it on this machine and allow cross-origin access.");
  }
  const body = (await queued.json().catch(() => null)) as { prompt_id?: string; error?: unknown } | null;
  if (!queued.ok || !body?.prompt_id) {
    const reason = body?.error ? JSON.stringify(body.error) : `ComfyUI refused the graph (${queued.status}).`;
    throw new Error(reason);
  }
  const promptId = body.prompt_id;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (input.cancelled()) throw new Error("Render cancelled.");
    const history = await fetch(`${host}/history/${encodeURIComponent(promptId)}`, { mode: "cors" });
    if (!history.ok) continue;
    const payload = (await history.json()) as Record<string, { status?: { status_str?: string }; outputs?: Record<string, { images?: OutFile[] }> }>;
    const entry = payload[promptId];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error("ComfyUI failed that checkpoint run.");
    const files = filesOf(entry.outputs);
    if (!files.length) continue;
    const blobs: Blob[] = [];
    for (const file of files) {
      const view = new URL(`${host}/view`);
      view.searchParams.set("filename", file.filename);
      view.searchParams.set("type", file.type || "output");
      if (file.subfolder) view.searchParams.set("subfolder", file.subfolder);
      const image = await fetch(view, { mode: "cors" });
      if (!image.ok) throw new Error("ComfyUI finished, but the still could not be downloaded.");
      blobs.push(await image.blob());
    }
    return blobs;
  }
  throw new Error("ComfyUI is still rendering. Try again in a moment.");
}
