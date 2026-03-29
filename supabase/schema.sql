-- ============================================
-- SCHEMA COMPLET - Plateforme Échange d'Avis
-- À coller dans Supabase > SQL Editor > Run
-- ============================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLE : membres
-- ============================================
create table public.membres (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  nom text not null,
  prenom text not null,
  email text not null unique,
  whatsapp text not null,
  fiche_google_url text not null,
  fiche_google_nom text,
  credits integer not null default 0,
  actif boolean not null default true,
  date_debut_abonnement date not null default current_date,
  date_fin_abonnement date not null default (current_date + interval '30 days'),
  taux_completion numeric(5,2) default 100.00,
  missions_assignees integer default 0,
  missions_completees integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- TABLE : missions (donner un avis)
-- ============================================
create table public.missions (
  id uuid primary key default uuid_generate_v4(),
  membre_id uuid not null references public.membres(id) on delete cascade,
  demande_id uuid not null references public.demandes(id) on delete cascade,
  statut text not null default 'assignee' check (statut in ('assignee', 'completee', 'expiree', 'annulee')),
  screenshot_url text,
  assignee_at timestamptz not null default now(),
  expire_at timestamptz not null default (now() + interval '24 hours'),
  completee_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABLE : demandes (recevoir un avis)
-- ============================================
create table public.demandes (
  id uuid primary key default uuid_generate_v4(),
  membre_id uuid not null references public.membres(id) on delete cascade,
  fiche_google_url text not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'assignee', 'completee', 'annulee')),
  created_at timestamptz not null default now(),
  completee_at timestamptz
);

-- ============================================
-- TABLE : historique_credits
-- ============================================
create table public.historique_credits (
  id uuid primary key default uuid_generate_v4(),
  membre_id uuid not null references public.membres(id) on delete cascade,
  type text not null check (type in ('gain_avis', 'consommation_demande', 'credit_manuel', 'expiration')),
  montant integer not null,
  solde_avant integer not null,
  solde_apres integer not null,
  note text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- ============================================
-- TABLE : avis_donnes (anti-doublon)
-- Pour savoir qu'un membre a déjà noté une fiche
-- ============================================
create table public.avis_donnes (
  id uuid primary key default uuid_generate_v4(),
  membre_id uuid not null references public.membres(id) on delete cascade,
  fiche_google_url text not null,
  mission_id uuid references public.missions(id),
  created_at timestamptz not null default now(),
  unique(membre_id, fiche_google_url)
);

-- ============================================
-- TABLE : admins
-- ============================================
create table public.admins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  email text not null,
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_membres_actif on public.membres(actif);
create index idx_membres_fin_abonnement on public.membres(date_fin_abonnement);
create index idx_demandes_statut on public.demandes(statut);
create index idx_demandes_created_at on public.demandes(created_at);
create index idx_missions_statut on public.missions(statut);
create index idx_missions_expire_at on public.missions(expire_at);
create index idx_avis_donnes_membre on public.avis_donnes(membre_id);

-- ============================================
-- FUNCTION : mettre à jour updated_at auto
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_membres_updated
  before update on public.membres
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- FUNCTION : obtenir la prochaine demande FIFO
-- pour un membre donné (sans doublon)
-- ============================================
create or replace function public.get_next_demande(p_membre_id uuid)
returns public.demandes as $$
declare
  v_demande public.demandes;
begin
  select d.* into v_demande
  from public.demandes d
  where d.statut = 'en_attente'
    and d.membre_id != p_membre_id
    and not exists (
      select 1 from public.avis_donnes ad
      where ad.membre_id = p_membre_id
        and ad.fiche_google_url = d.fiche_google_url
    )
    and not exists (
      select 1 from public.missions m
      where m.demande_id = d.id
        and m.statut = 'assignee'
    )
  order by d.created_at asc
  limit 1;

  return v_demande;
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : assigner une mission
-- ============================================
create or replace function public.assigner_mission(p_membre_id uuid)
returns json as $$
declare
  v_demande public.demandes;
  v_mission public.missions;
begin
  -- Trouver la prochaine demande FIFO
  v_demande := public.get_next_demande(p_membre_id);

  if v_demande.id is null then
    return json_build_object('success', false, 'error', 'Aucune demande disponible pour le moment');
  end if;

  -- Créer la mission
  insert into public.missions (membre_id, demande_id, statut, expire_at)
  values (p_membre_id, v_demande.id, 'assignee', now() + interval '24 hours')
  returning * into v_mission;

  -- Mettre à jour le statut de la demande
  update public.demandes set statut = 'assignee' where id = v_demande.id;

  -- Incrémenter missions_assignees
  update public.membres set missions_assignees = missions_assignees + 1 where id = p_membre_id;

  return json_build_object(
    'success', true,
    'mission_id', v_mission.id,
    'fiche_url', v_demande.fiche_google_url,
    'expire_at', v_mission.expire_at
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : valider une mission (screenshot)
-- ============================================
create or replace function public.valider_mission(p_mission_id uuid, p_screenshot_url text)
returns json as $$
declare
  v_mission public.missions;
  v_membre public.membres;
  v_demande public.demandes;
begin
  -- Récupérer la mission
  select * into v_mission from public.missions where id = p_mission_id and statut = 'assignee';

  if v_mission.id is null then
    return json_build_object('success', false, 'error', 'Mission introuvable ou déjà traitée');
  end if;

  -- Vérifier délai 24h
  if now() > v_mission.expire_at then
    update public.missions set statut = 'expiree' where id = p_mission_id;
    return json_build_object('success', false, 'error', 'Délai de 24h dépassé');
  end if;

  -- Récupérer membre et demande
  select * into v_membre from public.membres where id = v_mission.membre_id;
  select * into v_demande from public.demandes where id = v_mission.demande_id;

  -- Mettre à jour la mission
  update public.missions
  set statut = 'completee', screenshot_url = p_screenshot_url, completee_at = now()
  where id = p_mission_id;

  -- Mettre à jour la demande
  update public.demandes set statut = 'completee', completee_at = now() where id = v_demande.id;

  -- Créditer le membre qui a donné l'avis (+1)
  update public.membres
  set credits = credits + 1,
      missions_completees = missions_completees + 1,
      taux_completion = round((missions_completees + 1)::numeric / nullif(missions_assignees, 0) * 100, 2)
  where id = v_mission.membre_id
  returning * into v_membre;

  -- Historique crédit
  insert into public.historique_credits (membre_id, type, montant, solde_avant, solde_apres, ref_id)
  values (v_mission.membre_id, 'gain_avis', 1, v_membre.credits - 1, v_membre.credits, p_mission_id);

  -- Enregistrer anti-doublon
  insert into public.avis_donnes (membre_id, fiche_google_url, mission_id)
  values (v_mission.membre_id, v_demande.fiche_google_url, p_mission_id)
  on conflict do nothing;

  return json_build_object(
    'success', true,
    'credits_nouveau_solde', v_membre.credits,
    'demandeur_id', v_demande.membre_id
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : soumettre une demande d'avis
-- ============================================
create or replace function public.soumettre_demande(p_membre_id uuid)
returns json as $$
declare
  v_membre public.membres;
begin
  select * into v_membre from public.membres where id = p_membre_id and actif = true;

  if v_membre.id is null then
    return json_build_object('success', false, 'error', 'Compte inactif');
  end if;

  if v_membre.credits < 1 then
    return json_build_object('success', false, 'error', 'Solde insuffisant');
  end if;

  -- Débiter 1 crédit
  update public.membres set credits = credits - 1 where id = p_membre_id;

  -- Historique
  insert into public.historique_credits (membre_id, type, montant, solde_avant, solde_apres)
  values (p_membre_id, 'consommation_demande', -1, v_membre.credits, v_membre.credits - 1);

  -- Créer la demande
  insert into public.demandes (membre_id, fiche_google_url)
  values (p_membre_id, v_membre.fiche_google_url);

  return json_build_object('success', true, 'nouveau_solde', v_membre.credits - 1);
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION : créditer manuellement (admin)
-- ============================================
create or replace function public.crediter_membre(p_membre_id uuid, p_montant integer, p_note text default null)
returns json as $$
declare
  v_membre public.membres;
begin
  select * into v_membre from public.membres where id = p_membre_id;

  if v_membre.id is null then
    return json_build_object('success', false, 'error', 'Membre introuvable');
  end if;

  update public.membres set credits = credits + p_montant where id = p_membre_id;

  insert into public.historique_credits (membre_id, type, montant, solde_avant, solde_apres, note)
  values (p_membre_id, 'credit_manuel', p_montant, v_membre.credits, v_membre.credits + p_montant, p_note);

  return json_build_object('success', true, 'nouveau_solde', v_membre.credits + p_montant);
end;
$$ language plpgsql security definer;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.membres enable row level security;
alter table public.missions enable row level security;
alter table public.demandes enable row level security;
alter table public.historique_credits enable row level security;
alter table public.avis_donnes enable row level security;
alter table public.admins enable row level security;

-- Membres : chaque membre voit uniquement son profil
create policy "membre_voir_son_profil" on public.membres
  for select using (auth.uid() = user_id);

create policy "membre_modifier_son_profil" on public.membres
  for update using (auth.uid() = user_id);

-- Missions : chaque membre voit ses missions
create policy "membre_voir_ses_missions" on public.missions
  for select using (
    membre_id in (select id from public.membres where user_id = auth.uid())
  );

-- Demandes : chaque membre voit ses demandes
create policy "membre_voir_ses_demandes" on public.demandes
  for select using (
    membre_id in (select id from public.membres where user_id = auth.uid())
  );

-- Historique crédits : chaque membre voit son historique
create policy "membre_voir_historique" on public.historique_credits
  for select using (
    membre_id in (select id from public.membres where user_id = auth.uid())
  );

-- Admin : accès total via service_role (backend uniquement)
