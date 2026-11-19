import { DOWNLOAD_URL, batchCap, profilePatch, type Engine, type LaptopProfile } from "@/lib/studio/settings";
import { useStudio } from "@/lib/studio/store";
import { Btn, Field, controlClass } from "@/components/studio/ui";

const ENGINES: { id: Engine; label: string }[] = [
  { id: "xai", label: "Built-in" },
  { id: "api", label: "API server" },
  { id: "comfy", label: "Local checkpoint" },
];

const PROFILES: { id: LaptopProfile; label: string; note: string }[] = [
  { id: "efficient", label: "Efficient", note: "512px, 8 steps, 1 still. Lightest on a laptop." },
  { id: "balanced", label: "Balanced", note: "768px, 20 steps, up to 2 stills." },
  { id: "full", label: "Full", note: "1024px, 28 steps, up to 10 stills." },
];

export function SettingsPane() {
  const settings = useStudio((state) => state.settings);
  const updateSettings = useStudio((state) => state.updateSettings);

  function downloadConfig() {
    const copy = { ...settings, apiKey: "" };
    const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "movie-studio-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3 md:p-4">
      <div>
        <h2 className="font-display text-2xl leading-none">Settings</h2>
        <p className="mt-1 text-sm text-stone">
          Download the app, point stills at any image API, or run a basic checkpoint on this laptop through ComfyUI.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-3">
        <h3 className="text-sm text-bone">Download</h3>
        <p className="text-sm text-stone">
          The current source is a zip. On the laptop: unzip, <span className="text-bone">npm install</span>, then{" "}
          <span className="text-bone">npm run dev</span>. Put an xAI key in <span className="text-bone">XAI_API_KEY</span> only if you use the built-in engine.
        </p>
        <a href={DOWNLOAD_URL} className="inline-flex h-11 items-center justify-center rounded-md bg-bone px-4 text-sm text-ink">
          Download movie-studio.zip
        </a>
        <Btn onClick={downloadConfig}>Save settings file</Btn>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-3">
        <h3 className="text-sm text-bone">Run stills on</h3>
        <div className="flex flex-wrap gap-2">
          {ENGINES.map((engine) => (
            <Btn key={engine.id} tone={settings.engine === engine.id ? "solid" : "quiet"} onClick={() => updateSettings({ engine: engine.id })}>
              {engine.label}
            </Btn>
          ))}
        </div>
        {settings.engine === "xai" ? (
          <p className="text-sm text-stone">Stills and shots use the built-in service. Shots always use it.</p>
        ) : null}
        {settings.engine === "api" ? (
          <div className="grid gap-3">
            <Field label="API address">
              <input
                value={settings.apiBase}
                onChange={(event) => updateSettings({ apiBase: event.target.value })}
                placeholder="https://api.example.com/v1"
                aria-label="API address"
                className={controlClass}
              />
            </Field>
            <Field label="Model">
              <input
                value={settings.apiModel}
                onChange={(event) => updateSettings({ apiModel: event.target.value })}
                aria-label="Model"
                className={controlClass}
              />
            </Field>
            <Field label="API key">
              <input
                type="password"
                value={settings.apiKey}
                onChange={(event) => updateSettings({ apiKey: event.target.value })}
                aria-label="API key"
                className={controlClass}
                autoComplete="off"
              />
            </Field>
            <p className="text-xs text-mist">
              The server must accept POST /images/generations with a bearer key, a prompt, n, and size. The key stays in this browser. It is not in the settings file.
            </p>
          </div>
        ) : null}
        {settings.engine === "comfy" ? (
          <div className="grid gap-3">
            <Field label="ComfyUI address">
              <input
                value={settings.comfyHost}
                onChange={(event) => updateSettings({ comfyHost: event.target.value })}
                aria-label="ComfyUI address"
                className={controlClass}
              />
            </Field>
            <Field label="Checkpoint">
              <input
                value={settings.checkpoint}
                onChange={(event) => updateSettings({ checkpoint: event.target.value })}
                placeholder="anything-v5.safetensors"
                aria-label="Checkpoint"
                className={controlClass}
              />
            </Field>
            <p className="text-xs text-mist">
              Any basic checkpoint ComfyUI can load with Checkpoint Loader. The filename has to match the file in that install. ComfyUI must already be running, with cross-origin access open. This graph is a still: empty latent, one sampler, one VAE.
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-3">
        <h3 className="text-sm text-bone">Laptop</h3>
        <p className="text-sm text-stone">
          These settings reduce the work each still asks for. They do not change the laptop’s power plan. Efficient is the lightest. A local run uses at most {batchCap(settings.profile)} still{batchCap(settings.profile) === 1 ? "" : "s"} at once.
        </p>
        <div className="flex flex-wrap gap-2">
          {PROFILES.map((profile) => (
            <Btn
              key={profile.id}
              tone={settings.profile === profile.id ? "solid" : "quiet"}
              onClick={() => updateSettings(profilePatch(profile.id))}
            >
              {profile.label}
            </Btn>
          ))}
        </div>
        <p className="text-xs text-mist">{PROFILES.find((profile) => profile.id === settings.profile)?.note}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Long side">
            <input
              type="number"
              min={256}
              max={1280}
              value={settings.maxSide}
              onChange={(event) => updateSettings({ maxSide: Math.min(1280, Math.max(256, Number(event.target.value) || 512)) })}
              aria-label="Long side"
              className={controlClass}
            />
          </Field>
          <Field label="Steps">
            <input
              type="number"
              min={1}
              max={50}
              value={settings.steps}
              onChange={(event) => updateSettings({ steps: Math.min(50, Math.max(1, Number(event.target.value) || 1)) })}
              aria-label="Steps"
              className={controlClass}
            />
          </Field>
          <Field label="CFG">
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={settings.cfg}
              onChange={(event) => updateSettings({ cfg: Math.min(20, Math.max(1, Number(event.target.value) || 1)) })}
              aria-label="CFG"
              className={controlClass}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
