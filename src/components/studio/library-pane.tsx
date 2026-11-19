import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Btn, controlClass } from "@/components/studio/ui";
import { dbGetBlob } from "@/lib/studio/idb";
import { formatTime } from "@/lib/studio/prompt";
import { useStudio } from "@/lib/studio/store";
import type { AssetKind } from "@/lib/studio/types";

export function LibraryPane() {
  const projects = useStudio((state) => state.projects);
  const folders = useStudio((state) => state.folders);
  const assets = useStudio((state) => state.assets);
  const activeProjectId = useStudio((state) => state.activeProjectId);
  const activeFolderId = useStudio((state) => state.activeFolderId);
  const selectedAssetId = useStudio((state) => state.selectedAssetId);
  const selectFolder = useStudio((state) => state.selectFolder);
  const addFolder = useStudio((state) => state.addFolder);
  const deleteFolder = useStudio((state) => state.deleteFolder);
  const selectAsset = useStudio((state) => state.selectAsset);
  const updateAsset = useStudio((state) => state.updateAsset);
  const deleteAsset = useStudio((state) => state.deleteAsset);
  const uploadFiles = useStudio((state) => state.uploadFiles);
  const pendingUploads = useStudio((state) => state.pendingUploads);
  const setPending = useStudio((state) => state.setPending);
  const discardPending = useStudio((state) => state.discardPending);
  const filePending = useStudio((state) => state.filePending);
  const saveNote = useStudio((state) => state.saveNote);
  const useAsset = useStudio((state) => state.useAsset);
  const renameProject = useStudio((state) => state.renameProject);
  const deleteProject = useStudio((state) => state.deleteProject);
  const [folderName, setFolderName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [armed, setArmed] = useState(false);

  const project = projects.find((item) => item.id === activeProjectId);
  const projectFolders = folders.filter((folder) => folder.projectId === activeProjectId);
  const folder = projectFolders.find((item) => item.id === activeFolderId) ?? projectFolders[0];
  const visible = assets.filter((asset) => asset.folderId === folder?.id);
  const selected = assets.find((asset) => asset.id === selectedAssetId);

  if (!project || !folder) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-4">
        <h2 className="font-display text-2xl">No project open</h2>
        <p className="text-sm text-stone">
          Create one at the top. It becomes the file for characters, scenes, audio, voices, and notes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3">
      <label className="flex flex-col gap-1 text-xs text-stone">
        Project title
        <input
          className={controlClass}
          defaultValue={project.title}
          key={project.id}
          onBlur={(event) => void renameProject(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {projectFolders.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectFolder(item.id)}
            className={`h-11 rounded-md px-3 text-sm ${item.id === folder.id ? "bg-bone text-bg" : "border border-line text-bone"}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void addFolder(folderName);
          setFolderName("");
        }}
      >
        <input
          value={folderName}
          onChange={(event) => setFolderName(event.target.value)}
          placeholder="New folder"
          className={controlClass}
        />
        <Btn type="submit" className="shrink-0">
          Add
        </Btn>
      </form>
      {folder.kind === "custom" ? (
        <Btn tone="text" className="self-start px-0 text-danger" onClick={() => void deleteFolder(folder.id)}>
          Delete {folder.name}
        </Btn>
      ) : null}

      {folder.kind === "notes" ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveNote(noteTitle, noteBody);
            setNoteTitle("");
            setNoteBody("");
          }}
        >
          <input
            value={noteTitle}
            onChange={(event) => setNoteTitle(event.target.value)}
            placeholder="Episode 1"
            className={controlClass}
          />
          <textarea
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Beats, dialogue, what must stay true."
            className="min-h-28 rounded-md border border-line bg-ink p-3 text-sm"
          />
          <Btn type="submit" tone="solid">
            File note
          </Btn>
        </form>
      ) : null}
      <label className="flex h-11 cursor-pointer items-center justify-center rounded-md border border-dashed border-line text-sm text-stone">
        Upload your own into {folder.name}
        <input
          type="file"
          accept={acceptFor(folder.kind)}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void uploadFiles(folder.id, files);
          }}
        />
      </label>
      {pendingUploads
        .filter((item) => item.folderId === folder.id && !item.intoCut)
        .map((item) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3">
            <p className="text-sm text-stone">Name this {item.kind} before it is filed</p>
            {item.kind === "image" ? <img src={item.url} alt="" className="aspect-video w-full rounded-md object-cover" /> : null}
            <input
              value={item.title}
              onChange={(event) => setPending(item.id, { title: event.target.value })}
              aria-label="Upload name"
              placeholder="Name"
              className={controlClass}
            />
            <input
              value={item.tags}
              onChange={(event) => setPending(item.id, { tags: event.target.value })}
              aria-label="Upload tags"
              placeholder="Tags, separated by commas"
              className={controlClass}
            />
            <div className="flex gap-2">
              <Btn tone="solid" onClick={() => void filePending(item.id)}>
                File
              </Btn>
              <Btn tone="text" className="text-danger" onClick={() => discardPending(item.id)}>
                Discard
              </Btn>
            </div>
          </div>
        ))}

      <ul className="grid grid-cols-2 gap-2">
        {visible.map((asset) => (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => selectAsset(asset.id)}
              className={`w-full overflow-hidden rounded-md border text-left ${asset.id === selected?.id ? "border-bone" : "border-line"}`}
            >
              {asset.thumb ? (
                <img src={asset.thumb} alt={asset.title} className="aspect-video w-full object-cover" />
              ) : (
                <span className="flex aspect-video items-center justify-center bg-ink text-xs text-mist">
                  {asset.kind}
                </span>
              )}
              <span className="block truncate px-2 pt-2 text-sm">{asset.title}</span>
              <span className="block truncate px-2 pb-2 text-xs text-stone">
                {(asset.tags?.length ? asset.tags : [asset.tag]).map((tag) => `@${tag}`).join(", ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p className="text-sm text-stone">This folder is empty.</p> : null}

      {selected && selected.folderId === folder.id ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3">
          <p className="text-sm">
            @{selected.tag}
            {selected.duration ? ` · ${formatTime(selected.duration)}` : ""}
          </p>
          {selected.thumb ? (
            <img src={selected.thumb} alt={selected.title} className="aspect-video w-full rounded-md object-cover" />
          ) : null}
          {selected.kind === "audio" || selected.kind === "voice" || selected.kind === "video" ? (
            <BlobMedia id={selected.id} kind={selected.kind} />
          ) : null}
          <label className="flex flex-col gap-1 text-xs text-stone">
            Canon prompt
            <textarea
              key={selected.id}
              defaultValue={selected.kind === "note" ? selected.text : selected.prompt}
              onBlur={(event) =>
                void updateAsset(
                  selected.id,
                  selected.kind === "note"
                    ? { text: event.target.value, prompt: event.target.value.slice(0, 500) }
                    : { prompt: event.target.value },
                )
              }
              className="min-h-24 rounded-md border border-line bg-ink p-3 text-sm text-bone"
            />
          </label>
          <div className="flex gap-2">
            <Btn tone="solid" onClick={() => void useAsset(selected.id)}>
              Use @{selected.tag}
            </Btn>
            <Btn tone="text" className="text-danger" onClick={() => void deleteAsset(selected.id)}>
              <Trash2 className="size-4" />
              Delete
            </Btn>
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        {armed ? (
          <div className="flex gap-2">
            <Btn tone="text" className="text-danger" onClick={() => void deleteProject()}>
              Confirm delete
            </Btn>
            <Btn tone="text" onClick={() => setArmed(false)}>
              Cancel
            </Btn>
          </div>
        ) : (
          <Btn tone="text" onClick={() => setArmed(true)}>
            Delete project
          </Btn>
        )}
      </div>
    </div>
  );
}

function acceptFor(kind: string): string {
  if (kind === "notes") return ".txt,.md,text/plain,text/markdown";
  if (kind === "audio" || kind === "voices") return "audio/*";
  if (kind === "reels") return "video/*,image/*";
  if (kind === "characters" || kind === "scenes" || kind === "stills") return "image/*";
  return "image/*,audio/*,video/*";
}

function BlobMedia({ id, kind }: { id: string; kind: AssetKind }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    void dbGetBlob(id).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  if (!url) return <p className="text-xs text-mist">Loading media…</p>;
  if (kind === "video") return <video src={url} controls playsInline className="w-full rounded-md" />;
  return <audio src={url} controls className="w-full" />;
}
