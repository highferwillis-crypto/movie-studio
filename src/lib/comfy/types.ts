export type PortKind = "MODEL" | "CLIP" | "VAE" | "CONDITIONING" | "LATENT" | "IMAGE";

export type PortDef = { name: string; kind: PortKind };

export type WidgetKind = "text" | "number" | "select" | "image";

export type Widget = {
  key: string;
  label: string;
  kind: WidgetKind;
  value: string | number;
  options?: string[];
};

export type GraphNode = {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  widgets: Widget[];
  inputs: PortDef[];
  outputs: PortDef[];
};

export type GraphLink = {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
};

export type GraphKind = "still" | "shot";

export type Draft = {
  savedId: string | null;
  title: string;
  kind: GraphKind;
  nodes: GraphNode[];
  links: GraphLink[];
};

export type Workflow = Draft & {
  id: string;
  projectId: string;
  updatedAt: number;
};

export type Project = {
  id: string;
  title: string;
  host: string;
  createdAt: number;
};

export type Note = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  updatedAt: number;
};

export type Pane = "library" | "graph" | "node";
