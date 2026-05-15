-- ============================================
-- MIGRATION V2 — Bot WhatsApp + Paiements
-- À coller dans Supabase > SQL Editor > Run
-- ============================================

-- TABLE : sessions bot WhatsApp
create table if not exists public.bot_sessions (
  id uuid primary key default uuid_generate_v4(),
  phone text not null unique,
  membre_id uuid references public.membres(id) on delete cascade,
  state text not null default 'await_gmail' check (state in ('await_gmail', 'idle', 'mission_active')),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bot_sessions_phone on public.bot_sessions(phone);
create index if not exists idx_bot_sessions_membre on public.bot_sessions(membre_id);

-- TABLE : tokens Gmail OAuth
create table if not exists public.gmail_tokens (
  id uuid primary key default uuid_generate_v4(),
  membre_id uuid not null references public.membres(id) on delete cascade unique,
  gmail_email text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- TABLE : paiements mensuels
create table if not exists public.paiements (
  id uuid primary key default uuid_generate_v4(),
  membre_id uuid not null references public.membres(id) on delete cascade,
  mois text not null,
  montant integer not null default 399,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'paye', 'en_retard')),
  paye_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique(membre_id, mois)
);
create index if not exists idx_paiements_statut on public.paiements(statut);
create index if not exists idx_paiements_membre on public.paiements(membre_id);

-- TABLE : screenshots soumis par les membres
create table if not exists public.screenshots (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid not null references public.missions(id) on delete cascade unique,
  membre_id uuid not null references public.membres(id),
  wati_media_url text,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'valide', 'rejete')),
  note_admin text,
  created_at timestamptz not null default now(),
  traite_at timestamptz
);
create index if not exists idx_screenshots_statut on public.screenshots(statut);

-- Trigger updated_at pour bot_sessions
create trigger on_bot_sessions_updated
  before update on public.bot_sessions
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- FUNCTION : trouver le meilleur noteur
-- pour une demande donnée (0 crédits en priorité)
-- ============================================
create or replace function public.get_noteur_for_demande(p_demande_id uuid)
returns public.membres as $$
declare
  v_demande public.demandes;
  v_noteur public.membres;
begin
  select * into v_demande from public.demandes where id = p_demande_id and statut = 'en_attente';

  if v_demande.id is null then
    return null;
  end if;

  select m.* into v_noteur
  from public.membres m
  where m.actif = true
    and m.id != v_demande.membre_id
    and not exists (
      select 1 from public.avis_donnes ad
      where ad.membre_id = m.id
        and ad.fiche_google_url = v_demande.fiche_google_url
    )
    and not exists (
      select 1 from public.missions mi
      where mi.membre_id = m.id
        and mi.statut = 'assignee'
    )
  order by m.credits asc, m.created_at asc
  limit 1;

  return v_noteur;
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : créer une mission (30 min)
-- ============================================
create or replace function public.creer_mission(p_membre_id uuid, p_demande_id uuid)
returns public.missions as $$
declare
  v_mission public.missions;
begin
  insert into public.missions (membre_id, demande_id, statut, expire_at)
  values (p_membre_id, p_demande_id, 'assignee', now() + interval '30 minutes')
  returning * into v_mission;

  update public.demandes set statut = 'assignee' where id = p_demande_id;
  update public.membres set missions_assignees = missions_assignees + 1 where id = p_membre_id;

  return v_mission;
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : expirer missions 30 min
-- remet la demande à sa place (created_at intact)
-- ============================================
create or replace function public.expire_missions_retard()
returns setof uuid as $$
declare
  v_mission_id uuid;
begin
  for v_mission_id in
    select id from public.missions
    where statut = 'assignee' and expire_at < now()
  loop
    update public.missions set statut = 'expiree' where id = v_mission_id;

    update public.demandes set statut = 'en_attente'
    where id = (select demande_id from public.missions where id = v_mission_id)
      and not exists (
        select 1 from public.missions mi
        where mi.demande_id = (select demande_id from public.missions where id = v_mission_id)
          and mi.statut = 'assignee'
      );

    return next v_mission_id;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : valider screenshot (admin)
-- ============================================
create or replace function public.valider_screenshot(p_screenshot_id uuid, p_note text default null)
returns json as $$
declare
  v_screenshot public.screenshots;
  v_mission public.missions;
  v_membre public.membres;
  v_demande public.demandes;
begin
  select * into v_screenshot from public.screenshots
  where id = p_screenshot_id and statut = 'en_attente';

  if v_screenshot.id is null then
    return json_build_object('success', false, 'error', 'Screenshot introuvable ou déjà traité');
  end if;

  select * into v_mission from public.missions where id = v_screenshot.mission_id;
  select * into v_membre from public.membres where id = v_screenshot.membre_id;
  select * into v_demande from public.demandes where id = v_mission.demande_id;

  -- Valider le screenshot
  update public.screenshots
  set statut = 'valide', note_admin = p_note, traite_at = now()
  where id = p_screenshot_id;

  -- Valider la mission
  update public.missions
  set statut = 'completee', screenshot_url = v_screenshot.wati_media_url, completee_at = now()
  where id = v_mission.id;

  -- Valider la demande
  update public.demandes set statut = 'completee', completee_at = now()
  where id = v_demande.id;

  -- Créditer le noteur +1
  update public.membres
  set credits = credits + 1,
      missions_completees = missions_completees + 1
  where id = v_screenshot.membre_id;

  -- Historique
  insert into public.historique_credits (membre_id, type, montant, solde_avant, solde_apres, ref_id)
  values (v_screenshot.membre_id, 'gain_avis', 1, v_membre.credits, v_membre.credits + 1, v_mission.id);

  -- Anti-doublon
  insert into public.avis_donnes (membre_id, fiche_google_url, mission_id)
  values (v_screenshot.membre_id, v_demande.fiche_google_url, v_mission.id)
  on conflict do nothing;

  return json_build_object(
    'success', true,
    'noteur_id', v_screenshot.membre_id,
    'noteur_phone', v_membre.whatsapp,
    'demandeur_id', v_demande.membre_id,
    'credits_nouveau_solde', v_membre.credits + 1
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : rejeter screenshot (admin)
-- remet la mission + demande en attente
-- ============================================
create or replace function public.rejeter_screenshot(p_screenshot_id uuid, p_note text default null)
returns json as $$
declare
  v_screenshot public.screenshots;
  v_mission public.missions;
begin
  select * into v_screenshot from public.screenshots
  where id = p_screenshot_id and statut = 'en_attente';

  if v_screenshot.id is null then
    return json_build_object('success', false, 'error', 'Screenshot introuvable ou déjà traité');
  end if;

  select * into v_mission from public.missions where id = v_screenshot.mission_id;

  -- Rejeter le screenshot
  update public.screenshots
  set statut = 'rejete', note_admin = p_note, traite_at = now()
  where id = p_screenshot_id;

  -- Annuler la mission
  update public.missions set statut = 'annulee' where id = v_mission.id;

  -- Remettre la demande en attente (created_at intact = garde sa place)
  update public.demandes set statut = 'en_attente' where id = v_mission.demande_id;

  return json_build_object(
    'success', true,
    'noteur_id', v_screenshot.membre_id,
    'demande_id', v_mission.demande_id
  );
end;
$$ language plpgsql security definer;

-- RLS pour nouvelles tables (accès uniquement via service_role backend)
alter table public.bot_sessions enable row level security;
alter table public.gmail_tokens enable row level security;
alter table public.paiements enable row level security;
alter table public.screenshots enable row level security;
