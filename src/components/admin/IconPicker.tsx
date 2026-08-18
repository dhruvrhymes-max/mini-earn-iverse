import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { IconPreset } from "@/lib/icon-presets";
import { Upload, X } from "lucide-react";

type Props = {
  value: string | null | undefined;
  onChange: (url: string) => void;
  presets: IconPreset[];
  uploadPrefix?: string;
};

/** Icon chooser: preset gallery + custom upload + raw URL. */
export function IconPicker({ value, onChange, presets, uploadPrefix = "icons" }: Props) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${uploadPrefix}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Icon uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full border bg-muted overflow-hidden flex items-center justify-center shrink-0">
          {value ? <img src={value} alt="Selected icon" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">none</span>}
        </div>
        <div className="flex-1 space-y-2">
          <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://… or pick below" />
          <div className="flex gap-2">
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
              <Button type="button" size="sm" variant="outline" disabled={uploading} asChild>
                <span className="cursor-pointer"><Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Uploading…" : "Upload"}</span>
              </Button>
            </label>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}><X className="h-3.5 w-3.5 mr-1" />Clear</Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            title={p.label}
            onClick={() => onChange(p.url)}
            className={`h-11 w-11 rounded-full overflow-hidden border-2 transition ${value === p.url ? "border-primary scale-105" : "border-transparent hover:border-muted-foreground/40"}`}
          >
            <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
