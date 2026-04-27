import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic } = body;

  if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
    return NextResponse.json(
      { error: "Topic must be at least 3 characters" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: episode, error } = await supabase
    .from("episodes")
    .insert({
      topic: topic.trim(),
      status: "pending",
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await inngest.send({
    name: "episode/generate.requested",
    data: {
      episodeId: episode.id,
      topic: topic.trim(),
    },
  });

  return NextResponse.json(episode, { status: 201 });
}
