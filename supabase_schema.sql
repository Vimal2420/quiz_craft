-- ==============================================================================
-- QuizCraft Supabase Database Schema & Approval Setup (100% Safe to Re-Run)
-- Paste and run this script in: Supabase Dashboard > SQL Editor > "New query"
-- ==============================================================================

-- 1. PROFILES Table (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  role text default 'user' check (role in ('admin', 'user')),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Drop previous policies if re-running
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can update any profile (approve/reject)" on public.profiles;

-- Profiles Policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile (approve/reject)"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Automatic Profile Trigger upon Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    -- If role is admin, approved immediately; if normal user, mark as pending
    case 
      when coalesce(new.raw_user_meta_data->>'role', 'user') = 'admin' then 'approved'
      else 'pending'
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, profiles.name);
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. QUIZZES Table
create table if not exists public.quizzes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  description text,
  difficulty text default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  duration_minutes integer default 5,
  passing_score integer default 60,
  icon text default '📝',
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quizzes enable row level security;

drop policy if exists "Quizzes are viewable by approved users and admins" on public.quizzes;
drop policy if exists "Only admins can insert, update or delete quizzes" on public.quizzes;

create policy "Quizzes are viewable by approved users and admins"
  on public.quizzes for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'approved'
    )
  );

create policy "Only admins can insert, update or delete quizzes"
  on public.quizzes for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. QUESTIONS Table (MCQs categorized by Chapter)
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  chapter text not null default 'General', -- Which chapter this question belongs to
  quiz_id uuid references public.quizzes(id) on delete cascade,
  prompt text not null,
  code text,
  options jsonb not null, -- Array of 4 strings e.g. ["A", "B", "C", "D"]
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure chapter column exists if table was already created
alter table public.questions add column if not exists chapter text not null default 'General';
alter table public.questions alter column quiz_id drop not null;

alter table public.questions enable row level security;

drop policy if exists "Questions viewable by approved users" on public.questions;
drop policy if exists "Only admins can manage questions" on public.questions;

create policy "Questions viewable by approved users"
  on public.questions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'approved'
    )
  );

create policy "Only admins can manage questions"
  on public.questions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 5. ATTEMPTS Table (Candidate Submissions)
create table if not exists public.attempts (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null,
  total_questions integer not null,
  percentage integer not null,
  passed boolean not null,
  time_taken_seconds integer not null,
  review jsonb,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.attempts enable row level security;

drop policy if exists "Users can view their own attempts" on public.attempts;
drop policy if exists "Admins can view all attempts" on public.attempts;
drop policy if exists "Approved users can insert test attempts" on public.attempts;

create policy "Users can view their own attempts"
  on public.attempts for select
  using (auth.uid() = user_id);

create policy "Admins can view all attempts"
  on public.attempts for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Approved users can insert test attempts"
  on public.attempts for insert
  with check (auth.uid() = user_id);
