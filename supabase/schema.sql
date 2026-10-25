-- ============================================================
-- ALQURANKU — Skema sinkronisasi data antar HP (Supabase)
-- ============================================================
-- Cara pakai:
--   1. Buat proyek di https://supabase.com (free tier cukup)
--   2. Dashboard → SQL Editor → paste seluruh file ini → Run
--   3. Dashboard → Authentication → Providers → Google: ENABLE,
--      isi Client ID Google dari Google Cloud Console
--      (client ID yang sama dipakai aplikasi).
-- ============================================================

-- Satu tabel generik "user_data" (kerangka): tiap dataset bookmarks/
-- posisi baca/setting disimpan sebagai satu baris ber-key.
create table if not exists public.user_data (
  user_id    uuid        not null default auth.uid(),
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Database harus memakai jam server (bukan jam HP) sebagai penentu
-- "siapa yang lebih baru" saat merge dua perangkat.
alter table public.user_data enable row level security;

-- RLS: tiap pengguna HANYA bisa melihat/mengubah baris miliknya sendiri.
-- Anon key aman dipakai di aplikasi karena kebijakan ini di level database.
drop policy if exists "user_data select own" on public.user_data;
create policy "user_data select own"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "user_data insert own" on public.user_data;
create policy "user_data insert own"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_data update own" on public.user_data;
create policy "user_data update own"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
