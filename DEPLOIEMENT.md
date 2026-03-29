# GUIDE DE DÉPLOIEMENT — Plateforme Échange d'Avis
## Temps estimé : 45 minutes

---

## ÉTAPE 1 — Créer ton projet Supabase (10 min)

1. Va sur https://supabase.com et crée un compte gratuit
2. Clique "New project", choisis un nom (ex: "avis-platform")
3. Choisis la région **EU West** (Frankfurt) pour le Maroc/France
4. Attends 2 minutes que le projet se crée

### Configurer la base de données
1. Dans Supabase, va dans **SQL Editor**
2. Copie tout le contenu du fichier `supabase/schema.sql`
3. Colle-le dans l'éditeur et clique **Run**
4. Tu dois voir "Success" — si erreur, relis le message

### Créer le bucket Storage pour les screenshots
1. Va dans **Storage** → **New bucket**
2. Nom : `screenshots`
3. Coche **Public bucket** → Save

### Récupérer tes clés API
1. Va dans **Settings** → **API**
2. Copie :
   - `Project URL` → c'est ton `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → c'est ton `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (clique "Reveal") → c'est ton `SUPABASE_SERVICE_ROLE_KEY`

---

## ÉTAPE 2 — Créer ton compte admin dans Supabase

1. Dans Supabase → **Authentication** → **Users** → **Invite user**
2. Entre ton email et un mot de passe fort
3. Note l'UUID de l'utilisateur créé (colonne "UID")
4. Dans **SQL Editor**, exécute cette commande en remplaçant les valeurs :

```sql
INSERT INTO public.admins (user_id, email)
VALUES ('COLLE-ICI-TON-UUID', 'ton@email.com');
```

---

## ÉTAPE 3 — Déployer sur Vercel (15 min)

1. Va sur https://github.com et crée un compte si tu n'en as pas
2. Crée un nouveau repository (ex: "avis-platform"), **Private**
3. Upload tous les fichiers du projet dans ce repository

### Déployer sur Vercel
1. Va sur https://vercel.com et connecte-toi avec GitHub
2. Clique **New Project** → sélectionne ton repository
3. Dans **Environment Variables**, ajoute ces 3 variables :

| Nom | Valeur |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ton URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ta clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | ta clé service_role |
| `NEXT_PUBLIC_APP_URL` | https://ton-projet.vercel.app |

4. Clique **Deploy** → attends 2-3 minutes
5. Vercel te donne une URL (ex: https://avis-platform.vercel.app) — c'est ton app !

---

## ÉTAPE 4 — Configurer WhatsApp avec WATI (optionnel au lancement)

Tu peux démarrer SANS WhatsApp. Les notifications seront juste loguées en console.
Quand tu veux l'activer :

1. Va sur https://wati.io → crée un compte (essai gratuit 7 jours)
2. Configure ton numéro WhatsApp Business
3. Récupère ton `API URL` et `API Token`
4. Dans Vercel → Settings → Environment Variables, ajoute :
   - `WATI_API_URL` = ton URL WATI
   - `WATI_API_TOKEN` = ton token
5. Redéploie en cliquant **Redeploy** dans Vercel

---

## ÉTAPE 5 — Tester l'application

1. Va sur ton URL Vercel
2. Connecte-toi avec ton email admin
3. Tu arrives sur le dashboard admin — tout est là

### Test complet du flux :
1. Admin : crée un membre (Membres → Nouveau membre)
2. Connecte-toi avec les identifiants du membre (autre onglet ou navigation privée)
3. Le membre clique "Donner un avis" → reçoit une fiche à noter
4. Upload un screenshot → le crédit est crédité
5. Le membre clique "Recevoir un avis" → soumet une demande

---

## STRUCTURE DES FICHIERS

```
avis-app/
├── app/
│   ├── login/page.tsx          ← Page de connexion
│   ├── admin/
│   │   ├── page.tsx            ← Dashboard admin
│   │   ├── membres/
│   │   │   ├── page.tsx        ← Liste des membres
│   │   │   ├── nouveau/page.tsx ← Créer un membre
│   │   │   └── [id]/page.tsx   ← Fiche membre
│   │   └── file/page.tsx       ← File d'attente
│   ├── membre/
│   │   ├── page.tsx            ← Accueil membre
│   │   ├── donner/page.tsx     ← Donner un avis
│   │   ├── recevoir/page.tsx   ← Recevoir un avis
│   │   └── historique/page.tsx ← Historique
│   └── api/
│       ├── admin/              ← Routes API admin
│       └── membre/             ← Routes API membre
├── components/
│   ├── admin/AdminNav.tsx      ← Navigation admin
│   └── membre/MembreNav.tsx    ← Navigation membre
├── lib/
│   ├── supabase.ts             ← Clients Supabase
│   └── whatsapp.ts             ← Notifications WhatsApp
├── supabase/
│   └── schema.sql              ← Base de données complète
└── types/index.ts              ← Types TypeScript
```

---

## EN CAS DE PROBLÈME

**Erreur "relation does not exist"** → Le schema SQL n'a pas été exécuté correctement, relance-le

**Erreur de connexion** → Vérifie que les variables d'environnement sont bien copiées sans espace

**WhatsApp ne fonctionne pas** → Normal si WATI n'est pas configuré, les notifications sont juste en console

**Page blanche** → Regarde les logs dans Vercel → Functions

---

## MISE À JOUR DE L'APP

1. Modifie les fichiers dans GitHub
2. Vercel redéploie automatiquement en 2 minutes
