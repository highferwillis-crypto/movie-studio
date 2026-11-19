import { useEffect, useRef, useState } from "react";
import { parseNoteBlock } from "@/lib/studio/prompt";
import { useStudio } from "@/lib/studio/store";
import { playSpeech, setVoiceEnabled, voiceEnabled } from "@/components/studio/speech";
import { Btn } from "@/components/studio/ui";

export function ChatPane() {
  const chats = useStudio((state) => state.chats);
  const activeProjectId = useStudio((state) => state.activeProjectId);
  const projects = useStudio((state) => state.projects);
  const chatInput = useStudio((state) => state.chatInput);
  const chatBusy = useStudio((state) => state.chatBusy);
  const setChatInput = useStudio((state) => state.setChatInput);
  const sendChat = useStudio((state) => state.sendChat);
  const saveNote = useStudio((state) => state.saveNote);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [voice, setVoice] = useState(true);
  const [speakError, setSpeakError] = useState("");
  const scope = activeProjectId ?? "free";
  const thread = chats.filter((message) => message.scope === scope);
  const project = projects.find((item) => item.id === activeProjectId);

  useEffect(() => {
    setVoice(voiceEnabled());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, chatBusy]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line px-3 py-3">
        <h2 className="font-display text-xl">Editor</h2>
        <p className="text-xs text-stone">
          {project
            ? `Talking inside ${project.title}. Voice reads replies aloud. Say “proceed with generating the script” to shoot it.`
            : "No project open. The editor can still see every filed project."}
        </p>
        <Btn
          className="mt-2"
          tone={voice ? "solid" : "quiet"}
          onClick={() => {
            const next = !voice;
            setVoice(next);
            setVoiceEnabled(next);
          }}
        >
          {voice ? "Voice on" : "Voice off"}
        </Btn>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {thread.length === 0 ? (
          <p className="text-sm text-stone">
            Try “Review {project?.title ?? "the project"} episode 1”. The open project’s names are already loaded. Write the script here, then render and file each piece on the stage.
          </p>
        ) : null}
        {thread.map((message) => {
          const note = message.role === "assistant" ? parseNoteBlock(message.content) : null;
          const text = note?.visible || message.content;
          return (
            <article key={message.id} className={message.role === "user" ? "self-end" : "self-start"}>
              <div
                className={`max-w-[42ch] rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "bg-bone text-bg" : "border border-line bg-ink"}`}
              >
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
              {note ? (
                <div className="mt-2 max-w-[42ch] rounded-xl border border-line bg-panel p-3">
                  <p className="text-sm">File “{note.title}” into Notes</p>
                  <Btn className="mt-2" tone="solid" onClick={() => void saveNote(note.title, note.body)}>
                    Save note
                  </Btn>
                </div>
              ) : null}
              {message.role === "assistant" ? (
                <Btn
                  className="mt-1"
                  onClick={() => {
                    setSpeakError("");
                    void playSpeech(text).catch((error: unknown) => {
                      setSpeakError(error instanceof Error ? error.message : "Could not speak.");
                    });
                  }}
                >
                  Listen
                </Btn>
              ) : null}
            </article>
          );
        })}
        {chatBusy ? <p className="text-sm text-mist">Reading the project…</p> : null}
        {speakError ? <p className="text-sm text-danger">{speakError}</p> : null}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void sendChat();
        }}
      >
        <textarea
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendChat();
            }
          }}
          placeholder="Let's review episode 1"
          className="min-h-16 w-full resize-y rounded-md border border-line bg-ink px-3 py-2 text-sm outline-none"
          rows={2}
        />
        <Btn type="submit" tone="solid" disabled={chatBusy || !chatInput.trim()} className="shrink-0">
          Send
        </Btn>
      </form>
    </div>
  );
}
