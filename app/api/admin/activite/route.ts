import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()

  const [{ data: missions }, { data: demandes }, { data: alertesRaw }] = await Promise.all([
    supabase
      .from('missions')
      .select('id, statut, assignee_at, expire_at, membres(prenom, nom), demandes(fiche_google_url, membres(prenom, nom, fiche_google_nom))')
      .order('assignee_at', { ascending: false })
      .limit(50),

    supabase
      .from('demandes')
      .select('id, created_at, fiche_google_url, membres(prenom, nom, fiche_google_nom)')
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: true }),

    supabase
      .from('missions')
      .select('membre_id, membres(prenom, nom)')
      .eq('statut', 'expiree')
  ])

  // Calculer alertes (membres avec le plus de missions ratées)
  const countByMembre: Record<string, any> = {}
  for (const m of alertesRaw || []) {
    if (!countByMembre[m.membre_id]) {
      countByMembre[m.membre_id] = {
        membre_id: m.membre_id,
        prenom: (m as any).membres?.prenom,
        nom: (m as any).membres?.nom,
        missions_expirees: 0
      }
    }
    countByMembre[m.membre_id].missions_expirees++
  }
  const alertes = Object.values(countByMembre)
    .filter((a: any) => a.missions_expirees >= 2)
    .sort((a: any, b: any) => b.missions_expirees - a.missions_expirees)

  return NextResponse.json({ missions: missions || [], demandes: demandes || [], alertes })
}

export const dynamic = 'force-dynamic'
