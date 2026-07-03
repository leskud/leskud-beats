import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const raw = readFileSync(".env.local", "utf8");
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  process.env[t.slice(0, eq)] ??= t.slice(eq + 1);
}

const beatId = "5974bcce-4599-41b5-b81a-763275a702b6";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const previewBuffer = readFileSync("debug-preview.mp3");
const previewPath = `${beatId}/preview.mp3`;

const { error: upError } = await supabase.storage
  .from("previews")
  .upload(previewPath, previewBuffer, {
    contentType: "audio/mpeg",
    upsert: true,
  });

if (upError) throw upError;

const { error } = await supabase
  .from("beats")
  .update({
    preview_path: previewPath,
    updated_at: new Date().toISOString(),
  })
  .eq("id", beatId);

if (error) throw error;

console.log("uploaded", previewBuffer.length);
