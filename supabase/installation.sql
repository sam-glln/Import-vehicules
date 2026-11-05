-- =========================================================
-- Dossier des demandes — installation dans Supabase
-- 1. Remplacez VOTRE_EMAIL@exemple.fr (2 fois, plus bas) par l'adresse
--    du compte propriétaire que vous créerez dans Supabase.
-- 2. Copiez tout ce fichier dans Supabase → SQL Editor → New query → Run.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.demandes (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  source       text not null default 'contact'
               check (source in ('accueil', 'inventaire', 'contact')),
  nom          text not null check (char_length(nom) between 1 and 120),
  email        text check (char_length(email) <= 200),
  telephone    text check (char_length(telephone) <= 40),
  vehicule_ref text check (char_length(vehicule_ref) <= 40),
  vehicule     text check (char_length(vehicule) <= 200),
  budget       text check (char_length(budget) <= 60),
  message      text check (char_length(message) <= 5000),
  statut       text not null default 'nouvelle'
               check (statut in ('nouvelle', 'en_cours', 'traitee', 'archivee')),
  notes        text check (char_length(notes) <= 5000),
  constraint demandes_contact check (email is not null or telephone is not null)
);

create index if not exists demandes_created_at_idx on public.demandes (created_at desc);

-- Sécurité : chaque ligne est protégée par des règles.
alter table public.demandes enable row level security;

-- Visiteurs du site : peuvent DÉPOSER une demande, jamais en lire.
drop policy if exists "visiteurs_deposent" on public.demandes;
create policy "visiteurs_deposent" on public.demandes
  for insert to anon
  with check (statut = 'nouvelle' and notes is null);

-- Propriétaire (vous seul, identifié par son e-mail) : accès complet.
drop policy if exists "proprietaire_gere" on public.demandes;
create policy "proprietaire_gere" on public.demandes
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'VOTRE_EMAIL@exemple.fr')
  with check ((auth.jwt() ->> 'email') = 'VOTRE_EMAIL@exemple.fr');

grant insert on public.demandes to anon;
grant select, insert, update, delete on public.demandes to authenticated;
