import { speakReply } from "@/lib/studio/api.functions";

let audio: HTMLAudioElement | null = null;
let lastSpoken = "";

export function voiceEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem("movie-studio-voice") !== "off";
}

export function setVoiceEnabled(on: boolean) {
  localStorage.setItem("movie-studio-voice", on ? "on" : "off");
}

export function spokenId(): string {
  return lastSpoken;
}

export function markSpoken(id: string) {
  lastSpoken = id;
}

export async function playSpeech(text: string): Promise<void> {
  const clean = text
    .replace(/:::note[\s\S]*?:::/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  if (!clean) return;
  const result = await speakReply({ data: { text: clean } });
  if (!result.ok) throw new Error(result.error);
  const binary = atob(result.audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: result.mime || "audio/mpeg" }));
  if (audio) {
    audio.pause();
    URL.revokeObjectURL(audio.src);
  }
  audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}
