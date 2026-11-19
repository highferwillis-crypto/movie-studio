import type { Draft, GraphLink, GraphNode, Widget } from "./types";

const samplers = ["euler", "euler_ancestral", "dpmpp_2m", "uni_pc", "ddim"];
const schedulers = ["simple", "normal", "karras", "beta"];

function widget(partial: Widget): Widget {
  return partial;
}

function node(
  id: string,
  type: string,
  title: string,
  x: number,
  y: number,
  widgets: Widget[],
  inputs: GraphNode["inputs"],
  outputs: GraphNode["outputs"],
): GraphNode {
  return { id, type, title, x, y, widgets, inputs, outputs };
}

function link(id: string, from: string, fromPort: string, to: string, toPort: string): GraphLink {
  return { id, from, fromPort, to, toPort };
}

export const NODE_TEMPLATES: { type: string; title: string; build: (id: string, x: number, y: number) => GraphNode }[] = [
  {
    type: "CheckpointLoaderSimple",
    title: "Checkpoint",
    build: (id, x, y) =>
      node(id, "CheckpointLoaderSimple", "Checkpoint", x, y, [widget({ key: "ckpt_name", label: "Checkpoint", kind: "text", value: "flux1-schnell.safetensors" })], [], [
        { name: "MODEL", kind: "MODEL" },
        { name: "CLIP", kind: "CLIP" },
        { name: "VAE", kind: "VAE" },
      ]),
  },
  {
    type: "UNETLoader",
    title: "UNET",
    build: (id, x, y) =>
      node(
        id,
        "UNETLoader",
        "UNET",
        x,
        y,
        [
          widget({ key: "unet_name", label: "UNET", kind: "text", value: "wan2.2_ti2v_5B_fp16.safetensors" }),
          widget({
            key: "weight_dtype",
            label: "Weight",
            kind: "select",
            value: "default",
            options: ["default", "fp8_e4m3fn", "fp8_e5m2"],
          }),
        ],
        [],
        [{ name: "MODEL", kind: "MODEL" }],
      ),
  },
  {
    type: "CLIPLoader",
    title: "CLIP",
    build: (id, x, y) =>
      node(
        id,
        "CLIPLoader",
        "CLIP",
        x,
        y,
        [
          widget({ key: "clip_name", label: "CLIP", kind: "text", value: "umt5_xxl_fp8_e4m3fn_scaled.safetensors" }),
          widget({
            key: "type",
            label: "Type",
            kind: "select",
            value: "wan",
            options: ["stable_diffusion", "sd3", "flux", "wan"],
          }),
        ],
        [],
        [{ name: "CLIP", kind: "CLIP" }],
      ),
  },
  {
    type: "VAELoader",
    title: "VAE",
    build: (id, x, y) =>
      node(id, "VAELoader", "VAE", x, y, [widget({ key: "vae_name", label: "VAE", kind: "text", value: "wan2.2_vae.safetensors" })], [], [
        { name: "VAE", kind: "VAE" },
      ]),
  },
  {
    type: "CLIPTextEncode",
    title: "CLIP Text",
    build: (id, x, y) =>
      node(
        id,
        "CLIPTextEncode",
        "CLIP Text",
        x,
        y,
        [widget({ key: "text", label: "Text", kind: "text", value: "" })],
        [{ name: "clip", kind: "CLIP" }],
        [{ name: "CONDITIONING", kind: "CONDITIONING" }],
      ),
  },
  {
    type: "FluxGuidance",
    title: "Flux guidance",
    build: (id, x, y) =>
      node(
        id,
        "FluxGuidance",
        "Flux guidance",
        x,
        y,
        [widget({ key: "guidance", label: "Guidance", kind: "number", value: 3.5 })],
        [{ name: "conditioning", kind: "CONDITIONING" }],
        [{ name: "CONDITIONING", kind: "CONDITIONING" }],
      ),
  },
  {
    type: "ModelSamplingSD3",
    title: "Shift",
    build: (id, x, y) =>
      node(
        id,
        "ModelSamplingSD3",
        "Shift",
        x,
        y,
        [widget({ key: "shift", label: "Shift", kind: "number", value: 5 })],
        [{ name: "model", kind: "MODEL" }],
        [{ name: "MODEL", kind: "MODEL" }],
      ),
  },
  {
    type: "EmptySD3LatentImage",
    title: "Latent",
    build: (id, x, y) =>
      node(
        id,
        "EmptySD3LatentImage",
        "Latent",
        x,
        y,
        [
          widget({ key: "width", label: "Width", kind: "number", value: 1024 }),
          widget({ key: "height", label: "Height", kind: "number", value: 1024 }),
          widget({ key: "batch_size", label: "Batch", kind: "number", value: 1 }),
        ],
        [],
        [{ name: "LATENT", kind: "LATENT" }],
      ),
  },
  {
    type: "EmptyHunyuanLatentVideo",
    title: "Video latent",
    build: (id, x, y) =>
      node(
        id,
        "EmptyHunyuanLatentVideo",
        "Video latent",
        x,
        y,
        [
          widget({ key: "width", label: "Width", kind: "number", value: 832 }),
          widget({ key: "height", label: "Height", kind: "number", value: 480 }),
          widget({ key: "length", label: "Frames", kind: "number", value: 33 }),
          widget({ key: "batch_size", label: "Batch", kind: "number", value: 1 }),
        ],
        [],
        [{ name: "LATENT", kind: "LATENT" }],
      ),
  },
  {
    type: "KSampler",
    title: "Sampler",
    build: (id, x, y) =>
      node(
        id,
        "KSampler",
        "Sampler",
        x,
        y,
        [
          widget({ key: "seed", label: "Seed", kind: "number", value: 0 }),
          widget({ key: "steps", label: "Steps", kind: "number", value: 4 }),
          widget({ key: "cfg", label: "CFG", kind: "number", value: 1 }),
          widget({ key: "sampler_name", label: "Sampler", kind: "select", value: "euler", options: samplers }),
          widget({ key: "scheduler", label: "Scheduler", kind: "select", value: "simple", options: schedulers }),
          widget({ key: "denoise", label: "Denoise", kind: "number", value: 1 }),
        ],
        [
          { name: "model", kind: "MODEL" },
          { name: "positive", kind: "CONDITIONING" },
          { name: "negative", kind: "CONDITIONING" },
          { name: "latent_image", kind: "LATENT" },
        ],
        [{ name: "LATENT", kind: "LATENT" }],
      ),
  },
  {
    type: "VAEDecode",
    title: "Decode",
    build: (id, x, y) =>
      node(id, "VAEDecode", "Decode", x, y, [], [
        { name: "samples", kind: "LATENT" },
        { name: "vae", kind: "VAE" },
      ], [{ name: "IMAGE", kind: "IMAGE" }]),
  },
  {
    type: "SaveImage",
    title: "Save still",
    build: (id, x, y) =>
      node(id, "SaveImage", "Save still", x, y, [widget({ key: "filename_prefix", label: "Prefix", kind: "text", value: "flux" })], [
        { name: "images", kind: "IMAGE" },
      ], []),
  },
  {
    type: "SaveAnimatedWEBP",
    title: "Save shot",
    build: (id, x, y) =>
      node(
        id,
        "SaveAnimatedWEBP",
        "Save shot",
        x,
        y,
        [
          widget({ key: "filename_prefix", label: "Prefix", kind: "text", value: "wan" }),
          widget({ key: "fps", label: "FPS", kind: "number", value: 16 }),
          widget({ key: "lossless", label: "Lossless", kind: "select", value: "false", options: ["false", "true"] }),
          widget({ key: "quality", label: "Quality", kind: "number", value: 80 }),
          widget({ key: "method", label: "Method", kind: "select", value: "default", options: ["default"] }),
        ],
        [{ name: "images", kind: "IMAGE" }],
        [],
      ),
  },
  {
    type: "LoadImage",
    title: "Source",
    build: (id, x, y) =>
      node(id, "LoadImage", "Source", x, y, [widget({ key: "image", label: "Image", kind: "image", value: "" })], [], [{ name: "IMAGE", kind: "IMAGE" }]),
  },
  {
    type: "VAEEncode",
    title: "Encode",
    build: (id, x, y) =>
      node(id, "VAEEncode", "Encode", x, y, [], [
        { name: "pixels", kind: "IMAGE" },
        { name: "vae", kind: "VAE" },
      ], [{ name: "LATENT", kind: "LATENT" }]),
  },
  {
    type: "WanImageToVideo",
    title: "Start frame",
    build: (id, x, y) =>
      node(
        id,
        "WanImageToVideo",
        "Start frame",
        x,
        y,
        [
          widget({ key: "width", label: "Width", kind: "number", value: 832 }),
          widget({ key: "height", label: "Height", kind: "number", value: 480 }),
          widget({ key: "length", label: "Frames", kind: "number", value: 33 }),
          widget({ key: "batch_size", label: "Batch", kind: "number", value: 1 }),
        ],
        [
          { name: "positive", kind: "CONDITIONING" },
          { name: "negative", kind: "CONDITIONING" },
          { name: "vae", kind: "VAE" },
          { name: "start_image", kind: "IMAGE" },
        ],
        [
          { name: "positive", kind: "CONDITIONING" },
          { name: "negative", kind: "CONDITIONING" },
          { name: "LATENT", kind: "LATENT" },
        ],
      ),
  },
];

export function fluxStill(): Draft {
  return {
    savedId: null,
    title: "Flux still",
    kind: "still",
    nodes: [
      node("1", "CheckpointLoaderSimple", "Checkpoint", 32, 48, [widget({ key: "ckpt_name", label: "Checkpoint", kind: "text", value: "flux1-schnell.safetensors" })], [], [
        { name: "MODEL", kind: "MODEL" },
        { name: "CLIP", kind: "CLIP" },
        { name: "VAE", kind: "VAE" },
      ]),
      node("2", "CLIPTextEncode", "Positive", 320, 32, [widget({ key: "text", label: "Text", kind: "text", value: "" })], [{ name: "clip", kind: "CLIP" }], [
        { name: "CONDITIONING", kind: "CONDITIONING" },
      ]),
      node("3", "CLIPTextEncode", "Negative", 320, 220, [widget({ key: "text", label: "Text", kind: "text", value: "" })], [{ name: "clip", kind: "CLIP" }], [
        { name: "CONDITIONING", kind: "CONDITIONING" },
      ]),
      node(
        "4",
        "EmptySD3LatentImage",
        "Latent",
        320,
        400,
        [
          widget({ key: "width", label: "Width", kind: "number", value: 1024 }),
          widget({ key: "height", label: "Height", kind: "number", value: 1024 }),
          widget({ key: "batch_size", label: "Batch", kind: "number", value: 1 }),
        ],
        [],
        [{ name: "LATENT", kind: "LATENT" }],
      ),
      node(
        "5",
        "FluxGuidance",
        "Flux guidance",
        608,
        32,
        [widget({ key: "guidance", label: "Guidance", kind: "number", value: 3.5 })],
        [{ name: "conditioning", kind: "CONDITIONING" }],
        [{ name: "CONDITIONING", kind: "CONDITIONING" }],
      ),
      node(
        "6",
        "KSampler",
        "Sampler",
        608,
        200,
        [
          widget({ key: "seed", label: "Seed", kind: "number", value: 0 }),
          widget({ key: "steps", label: "Steps", kind: "number", value: 4 }),
          widget({ key: "cfg", label: "CFG", kind: "number", value: 1 }),
          widget({ key: "sampler_name", label: "Sampler", kind: "select", value: "euler", options: samplers }),
          widget({ key: "scheduler", label: "Scheduler", kind: "select", value: "simple", options: schedulers }),
          widget({ key: "denoise", label: "Denoise", kind: "number", value: 1 }),
        ],
        [
          { name: "model", kind: "MODEL" },
          { name: "positive", kind: "CONDITIONING" },
          { name: "negative", kind: "CONDITIONING" },
          { name: "latent_image", kind: "LATENT" },
        ],
        [{ name: "LATENT", kind: "LATENT" }],
      ),
      node("7", "VAEDecode", "Decode", 896, 180, [], [
        { name: "samples", kind: "LATENT" },
        { name: "vae", kind: "VAE" },
      ], [{ name: "IMAGE", kind: "IMAGE" }]),
      node("8", "SaveImage", "Save still", 1152, 200, [widget({ key: "filename_prefix", label: "Prefix", kind: "text", value: "flux" })], [
        { name: "images", kind: "IMAGE" },
      ], []),
    ],
    links: [
      link("l1", "1", "MODEL", "6", "model"),
      link("l2", "1", "CLIP", "2", "clip"),
      link("l3", "1", "CLIP", "3", "clip"),
      link("l4", "1", "VAE", "7", "vae"),
      link("l5", "2", "CONDITIONING", "5", "conditioning"),
      link("l6", "5", "CONDITIONING", "6", "positive"),
      link("l7", "3", "CONDITIONING", "6", "negative"),
      link("l8", "4", "LATENT", "6", "latent_image"),
      link("l9", "6", "LATENT", "7", "samples"),
      link("l10", "7", "IMAGE", "8", "images"),
    ],
  };
}

export function wanShot(): Draft {
  return {
    savedId: null,
    title: "Wan shot",
    kind: "shot",
    nodes: [
      node(
        "1",
        "UNETLoader",
        "UNET",
        32,
        32,
        [
          widget({ key: "unet_name", label: "UNET", kind: "text", value: "wan2.2_ti2v_5B_fp16.safetensors" }),
          widget({ key: "weight_dtype", label: "Weight", kind: "select", value: "default", options: ["default", "fp8_e4m3fn", "fp8_e5m2"] }),
        ],
        [],
        [{ name: "MODEL", kind: "MODEL" }],
      ),
      node(
        "2",
        "CLIPLoader",
        "CLIP",
        32,
        220,
        [
          widget({ key: "clip_name", label: "CLIP", kind: "text", value: "umt5_xxl_fp8_e4m3fn_scaled.safetensors" }),
          widget({ key: "type", label: "Type", kind: "select", value: "wan", options: ["stable_diffusion", "sd3", "flux", "wan"] }),
        ],
        [],
        [{ name: "CLIP", kind: "CLIP" }],
      ),
      node("3", "VAELoader", "VAE", 32, 420, [widget({ key: "vae_name", label: "VAE", kind: "text", value: "wan2.2_vae.safetensors" })], [], [
        { name: "VAE", kind: "VAE" },
      ]),
      node("4", "CLIPTextEncode", "Positive", 320, 32, [widget({ key: "text", label: "Text", kind: "text", value: "" })], [{ name: "clip", kind: "CLIP" }], [
        { name: "CONDITIONING", kind: "CONDITIONING" },
      ]),
      node(
        "5",
        "CLIPTextEncode",
        "Negative",
        320,
        220,
        [widget({ key: "text", label: "Text", kind: "text", value: "blur, flicker, watermark, warped anatomy" })],
        [{ name: "clip", kind: "CLIP" }],
        [{ name: "CONDITIONING", kind: "CONDITIONING" }],
      ),
      node(
        "6",
        "ModelSamplingSD3",
        "Shift",
        320,
        420,
        [widget({ key: "shift", label: "Shift", kind: "number", value: 5 })],
        [{ name: "model", kind: "MODEL" }],
        [{ name: "MODEL", kind: "MODEL" }],
      ),
      node(
        "7",
        "EmptyHunyuanLatentVideo",
        "Video latent",
        608,
        32,
        [
          widget({ key: "width", label: "Width", kind: "number", value: 832 }),
          widget({ key: "height", label: "Height", kind: "number", value: 480 }),
          widget({ key: "length", label: "Frames", kind: "number", value: 33 }),
          widget({ key: "batch_size", label: "Batch", kind: "number", value: 1 }),
        ],
        [],
        [{ name: "LATENT", kind: "LATENT" }],
      ),
      node(
        "8",
        "KSampler",
        "Sampler",
        608,
        280,
        [
          widget({ key: "seed", label: "Seed", kind: "number", value: 0 }),
          widget({ key: "steps", label: "Steps", kind: "number", value: 20 }),
          widget({ key: "cfg", label: "CFG", kind: "number", value: 5 }),
          widget({ key: "sampler_name", label: "Sampler", kind: "select", value: "uni_pc", options: samplers }),
          widget({ key: "scheduler", label: "Scheduler", kind: "select", value: "simple", options: schedulers }),
          widget({ key: "denoise", label: "Denoise", kind: "number", value: 1 }),
        ],
        [
          { name: "model", kind: "MODEL" },
          { name: "positive", kind: "CONDITIONING" },
          { name: "negative", kind: "CONDITIONING" },
          { name: "latent_image", kind: "LATENT" },
        ],
        [{ name: "LATENT", kind: "LATENT" }],
      ),
      node("9", "VAEDecode", "Decode", 896, 220, [], [
        { name: "samples", kind: "LATENT" },
        { name: "vae", kind: "VAE" },
      ], [{ name: "IMAGE", kind: "IMAGE" }]),
      node(
        "10",
        "SaveAnimatedWEBP",
        "Save shot",
        1152,
        200,
        [
          widget({ key: "filename_prefix", label: "Prefix", kind: "text", value: "wan" }),
          widget({ key: "fps", label: "FPS", kind: "number", value: 16 }),
          widget({ key: "lossless", label: "Lossless", kind: "select", value: "false", options: ["false", "true"] }),
          widget({ key: "quality", label: "Quality", kind: "number", value: 80 }),
          widget({ key: "method", label: "Method", kind: "select", value: "default", options: ["default"] }),
        ],
        [{ name: "images", kind: "IMAGE" }],
        [],
      ),
    ],
    links: [
      link("l1", "1", "MODEL", "6", "model"),
      link("l2", "6", "MODEL", "8", "model"),
      link("l3", "2", "CLIP", "4", "clip"),
      link("l4", "2", "CLIP", "5", "clip"),
      link("l5", "4", "CONDITIONING", "8", "positive"),
      link("l6", "5", "CONDITIONING", "8", "negative"),
      link("l7", "7", "LATENT", "8", "latent_image"),
      link("l8", "3", "VAE", "9", "vae"),
      link("l9", "8", "LATENT", "9", "samples"),
      link("l10", "9", "IMAGE", "10", "images"),
    ],
  };
}

function withDenoise(graph: GraphNode, value: number): GraphNode {
  return { ...graph, widgets: graph.widgets.map((item) => (item.key === "denoise" ? { ...item, value } : item)) };
}

export function fluxImage(): Draft {
  const base = fluxStill();
  const encode = node("4", "VAEEncode", "Encode", 320, 400, [], [
    { name: "pixels", kind: "IMAGE" },
    { name: "vae", kind: "VAE" },
  ], [{ name: "LATENT", kind: "LATENT" }]);
  const source = node("9", "LoadImage", "Source", 32, 400, [widget({ key: "image", label: "Image", kind: "image", value: "" })], [], [
    { name: "IMAGE", kind: "IMAGE" },
  ]);
  return {
    ...base,
    title: "Flux from image",
    nodes: [...base.nodes.map((item) => (item.id === "4" ? encode : item.type === "KSampler" ? withDenoise(item, 0.65) : item)), source],
    links: [...base.links, link("l11", "1", "VAE", "4", "vae"), link("l12", "9", "IMAGE", "4", "pixels")],
  };
}

export function wanImage(): Draft {
  const base = wanShot();
  const start = node(
    "7",
    "WanImageToVideo",
    "Start frame",
    608,
    32,
    [
      widget({ key: "width", label: "Width", kind: "number", value: 832 }),
      widget({ key: "height", label: "Height", kind: "number", value: 480 }),
      widget({ key: "length", label: "Frames", kind: "number", value: 33 }),
      widget({ key: "batch_size", label: "Batch", kind: "number", value: 1 }),
    ],
    [
      { name: "positive", kind: "CONDITIONING" },
      { name: "negative", kind: "CONDITIONING" },
      { name: "vae", kind: "VAE" },
      { name: "start_image", kind: "IMAGE" },
    ],
    [
      { name: "positive", kind: "CONDITIONING" },
      { name: "negative", kind: "CONDITIONING" },
      { name: "LATENT", kind: "LATENT" },
    ],
  );
  const source = node("11", "LoadImage", "Source", 32, 560, [widget({ key: "image", label: "Image", kind: "image", value: "" })], [], [
    { name: "IMAGE", kind: "IMAGE" },
  ]);
  const drop = new Set(["l5", "l6"]);
  return {
    ...base,
    title: "Wan from image",
    nodes: [...base.nodes.map((item) => (item.id === "7" ? start : item)), source],
    links: [
      ...base.links.filter((item) => !drop.has(item.id)),
      link("l5", "4", "CONDITIONING", "7", "positive"),
      link("l6", "5", "CONDITIONING", "7", "negative"),
      link("l11", "7", "positive", "8", "positive"),
      link("l12", "7", "negative", "8", "negative"),
      link("l13", "3", "VAE", "7", "vae"),
      link("l14", "11", "IMAGE", "7", "start_image"),
    ],
  };
}
