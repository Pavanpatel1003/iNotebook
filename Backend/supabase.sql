create table if not exists public.users (
    id uuid primary key,
    name text not null,
    email text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.notes (
    id uuid primary key,
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    description text not null,
    tag text not null default '',
    due_date text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx
    on public.notes (user_id, created_at desc);

create table if not exists public.attachments (
    id uuid primary key,
    note_id uuid not null references public.notes(id) on delete cascade,
    original_name text not null,
    stored_name text not null unique,
    mime_type text not null,
    size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
    created_at timestamptz not null default now()
);

create index if not exists attachments_note_created_idx
    on public.attachments (note_id, created_at);

alter table public.users enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'note-attachments',
    'note-attachments',
    false,
    52428800,
    array[
        'image/gif',
        'image/jpeg',
        'application/pdf',
        'image/png',
        'video/mp4',
        'video/webm',
        'image/webp'
    ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
