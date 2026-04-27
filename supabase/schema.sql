-- Mato Podcast Generator — Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.

-- Episodes table
create table if not exists episodes (
  id uuid default gen_random_uuid() primary key,
  topic text not null,
  status text not null default 'pending',
  script jsonb,
  audio_url text,
  segment_urls jsonb default '[]',
  duration_seconds integer,
  error text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable realtime for live status updates
alter publication supabase_realtime add table episodes;

-- Index for listing episodes by date
create index if not exists idx_episodes_created_at on episodes (created_at desc);

-- Index for filtering by status (useful for monitoring active jobs)
create index if not exists idx_episodes_status on episodes (status);

-- Auto-update the updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger episodes_updated_at
  before update on episodes
  for each row
  execute function update_updated_at();

-- Storage: create the 'episode-audio' bucket via the Supabase dashboard
-- Settings: Public bucket, no file size limit needed for small WAV files
-- Alternatively, run this RPC (requires service role):
-- insert into storage.buckets (id, name, public) values ('episode-audio', 'episode-audio', true);
