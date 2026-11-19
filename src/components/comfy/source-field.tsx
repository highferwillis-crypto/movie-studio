import { useEffect, useState } from "react";
import { useDesk } from "@/lib/comfy/store";
import { getImage } from "@/lib/comfy/images";

export function SourceField({ nodeId }: { nodeId: string }) {
  const node = useDesk((state) => state.draft?.nodes.find((item) => item.id === nodeId));
  const name = useDesk((state) => {
    const id = String(node?.widgets.find((item) => item.key === "image")?.value ?? "");
    return id ? state.sourceNames[id] : "";
  });
  const setSource = useDesk((state) => state.setSource);
  const imageId = String(node?.widgets.find((item) => item.key === "image")?.value ?? "");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!imageId) {
      setUrl("");
      return;
    }
    let revoke = "";
    let alive = true;
    void getImage(imageId).then((blob) => {
      if (!alive) return;
      if (!blob) {
        setUrl("");
        return;
      }
      revoke = URL.createObjectURL(blob);
      setUrl(revoke);
    });
    return () => {
      alive = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [imageId]);

  return (
    <div className="flex items-center gap-3">
      {url ? <img src={url} alt="" className="h-16 w-16 border border-line object-cover" /> : null}
      <label className="inline-flex h-11 cursor-pointer items-center rounded-md border border-line bg-ink px-3 text-sm text-bone">
        {name || "Choose image"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void setSource(file, nodeId);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
