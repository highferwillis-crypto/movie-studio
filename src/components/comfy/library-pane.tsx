import { useEffect, useState } from "react";
import { Btn, controlClass } from "@/components/studio/ui";
import { useDesk } from "@/lib/comfy/store";

export function LibraryPane() {
  const projectId = useDesk((state) => state.activeProjectId);
  const allWorkflows = useDesk((state) => state.workflows);
  const allNotes = useDesk((state) => state.notes);
  const workflows = allWorkflows.filter((item) => item.projectId === projectId);
  const notes = allNotes.filter((item) => item.projectId === projectId);
  const draft = useDesk((state) => state.draft);
  const openWorkflow = useDesk((state) => state.openWorkflow);
  const deleteWorkflow = useDesk((state) => state.deleteWorkflow);
  const saveWorkflow = useDesk((state) => state.saveWorkflow);
  const saveNote = useDesk((state) => state.saveNote);
  const deleteNote = useDesk((state) => state.deleteNote);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  useEffect(() => {
    setTitle(draft?.title ?? "");
  }, [draft?.title, draft?.savedId]);

  if (!projectId) {
    return <p className="p-4 text-sm text-stone">Title a project to file graphs and notes.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <section className="border-b border-line p-4">
        <h2 className="text-xs uppercase tracking-wide text-mist">Graphs</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveWorkflow(title);
          }}
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Graph title"
            aria-label="Graph title"
            className={`${controlClass} min-w-0`}
          />
          <Btn type="submit" tone="solid" className="shrink-0">
            File
          </Btn>
        </form>
        <ul className="mt-3 flex flex-col gap-2">
          {workflows.length === 0 ? <li className="text-sm text-mist">Nothing filed yet.</li> : null}
          {workflows.map((workflow) => (
            <li key={workflow.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openWorkflow(workflow.id)}
                className={`h-11 min-w-0 flex-1 truncate rounded-md border px-3 text-left text-sm ${draft?.savedId === workflow.id ? "border-bone text-bone" : "border-line text-stone"}`}
              >
                {workflow.title}
                <span className="ml-2 text-xs text-mist">{workflow.kind === "shot" ? "shot" : "still"}</span>
              </button>
              <Btn tone="text" onClick={() => deleteWorkflow(workflow.id)} aria-label={`Remove ${workflow.title}`}>
                Remove
              </Btn>
            </li>
          ))}
        </ul>
      </section>
      <section className="p-4">
        <h2 className="text-xs uppercase tracking-wide text-mist">Notes</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => {
                  setNoteId(note.id);
                  setNoteTitle(note.title);
                  setNoteBody(note.body);
                }}
                className={`h-11 w-full truncate rounded-md border px-3 text-left text-sm ${noteId === note.id ? "border-bone text-bone" : "border-line text-stone"}`}
              >
                {note.title}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveNote(noteTitle, noteBody, noteId ?? undefined);
            if (!noteId) {
              setNoteTitle("");
              setNoteBody("");
            }
          }}
        >
          <input
            value={noteTitle}
            onChange={(event) => setNoteTitle(event.target.value)}
            placeholder="Note title"
            aria-label="Note title"
            className={controlClass}
          />
          <textarea
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Model filenames, sampler notes, what this graph is for."
            aria-label="Note"
            rows={5}
            className={`${controlClass} h-auto py-2`}
          />
          <div className="flex gap-2">
            <Btn type="submit" tone="solid">
              File note
            </Btn>
            {noteId ? (
              <Btn
                tone="quiet"
                onClick={() => {
                  deleteNote(noteId);
                  setNoteId(null);
                  setNoteTitle("");
                  setNoteBody("");
                }}
              >
                Remove
              </Btn>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
