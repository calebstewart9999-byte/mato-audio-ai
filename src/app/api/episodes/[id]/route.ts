import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { EpisodeScript } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH: Update episode script (allows user to edit script before TTS).
 * If the episode is in "script_ready" status, also re-triggers audio generation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { script, regenerate } = body as {
    script?: EpisodeScript;
    regenerate?: boolean;
  };

  const supabase = createServiceClient();

  if (script) {
    const { error } = await supabase
      .from("episodes")
      .update({ script, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (regenerate) {
    const { data: episode } = await supabase
      .from("episodes")
      .select("topic")
      .eq("id", id)
      .single();

    await supabase
      .from("episodes")
      .update({
        status: "script_ready",
        audio_url: null,
        segment_urls: [],
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await inngest.send({
      name: "episode/generate.requested",
      data: { episodeId: id, topic: episode?.topic ?? "" },
    });
  }

  const { data } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", id)
    .single();

  return NextResponse.json(data);
}
