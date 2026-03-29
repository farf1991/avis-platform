export type Membre = {
  id: string
  user_id: string
  nom: string
  prenom: string
  email: string
  whatsapp: string
  fiche_google_url: string
  fiche_google_nom: string | null
  credits: number
  actif: boolean
  date_debut_abonnement: string
  date_fin_abonnement: string
  taux_completion: number
  missions_assignees: number
  missions_completees: number
  created_at: string
  updated_at: string
}

export type Mission = {
  id: string
  membre_id: string
  demande_id: string
  statut: 'assignee' | 'completee' | 'expiree' | 'annulee'
  screenshot_url: string | null
  assignee_at: string
  expire_at: string
  completee_at: string | null
  created_at: string
  demandes?: Demande
}

export type Demande = {
  id: string
  membre_id: string
  fiche_google_url: string
  statut: 'en_attente' | 'assignee' | 'completee' | 'annulee'
  created_at: string
  completee_at: string | null
  membres?: Membre
}

export type HistoriqueCredit = {
  id: string
  membre_id: string
  type: 'gain_avis' | 'consommation_demande' | 'credit_manuel' | 'expiration'
  montant: number
  solde_avant: number
  solde_apres: number
  note: string | null
  ref_id: string | null
  created_at: string
}

export type Admin = {
  id: string
  user_id: string
  email: string
  created_at: string
}

export type DashboardStats = {
  membres_actifs: number
  alertes_renouvellement: number
  credits_en_circulation: number
  missions_en_cours: number
  demandes_en_attente: number
}
