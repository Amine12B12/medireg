// Crée un vrai compte client MediReg (rôle client) déjà rempli, pour tester l'appli de bout en bout.
// Usage : node --env-file=.env.local scripts/creer-compte-test.mjs <email> <fichier-identifiants>
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { writeFileSync } from 'fs'

const [email, sortie] = process.argv.slice(2)
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ok = (r, quoi) => { if (r.error) throw new Error(`${quoi} : ${r.error.message}`); return r.data }
const jours = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

const motDePasse = 'Test-' + randomBytes(9).toString('base64url')
const client = ok(await db.from('clients').insert({ nom: 'Test Medisphère Santé', type: 'PSDM', ville: 'Lille', contact_nom: 'Compte test', contact_email: email, forfait: 'starter', forfait_actif: true, statut: 'actif' }).select().single(), 'client')
const user = ok(await db.auth.admin.createUser({ email, password: motDePasse, email_confirm: true, user_metadata: { nom: client.nom, client_id: client.id } }), 'compte').user
ok(await db.from('profiles').upsert({ id: user.id, role: 'client', client_id: client.id, nom: 'Test', prenom: 'Compte', email }), 'profil')
const societe = ok(await db.from('societes').insert({ client_id: client.id, raison_sociale: 'Test Medisphère Santé SAS', nom_commercial: 'Test Medisphère Santé', forme_juridique: 'SAS', adresse_siege: '10 rue de Paris', code_postal: '59000', ville: 'Lille', email, statut: 'actif' }).select().single(), 'société')
const etab = ok(await db.from('etablissements_psdm').insert({ societe_id: societe.id, nom: 'Agence de Lille', adresse: '10 rue de Paris', code_postal: '59000', ville: 'Lille', email, est_siege: true, statut: 'actif' }).select().single(), 'établissement')

const criteres = ok(await db.from('criteres_psdm').select('id, code').order('code'), 'critères')
const cycle = ['pret_audit', 'pret_audit', 'procedure_a_valider', 'preuve_manquante', 'action_corrective', 'information_manquante', 'non_analyse']
ok(await db.from('reponses_criteres').insert(criteres.map((c, i) => ({ etablissement_id: etab.id, critere_id: c.id, statut: cycle[i % cycle.length], commentaire: i % 3 === 0 ? 'Procédure en place, preuves jointes.' : null, date_validation: cycle[i % cycle.length] === 'pret_audit' ? jours(-i) : null }))), 'réponses')

ok(await db.from('personnes').insert([
  { societe_id: societe.id, nom: 'Martin', prenom: 'Claire', fonction_reelle: 'Directrice', email: 'claire.martin@exemple.test', statut: 'actif' },
  { societe_id: societe.id, nom: 'Bernard', prenom: 'Hugo', fonction_reelle: 'Responsable qualité', email: 'hugo.bernard@exemple.test', statut: 'actif' },
  { societe_id: societe.id, nom: 'Petit', prenom: 'Sarah', fonction_reelle: 'Technicienne de livraison', email: 'sarah.petit@exemple.test', statut: 'actif' },
]), 'équipe')
ok(await db.from('evenements_indesirables').insert([
  { etablissement_id: etab.id, date_evenement: jours(-20), type: 'Livraison', description: 'Lit livré sans barrières.', gravite: 'mineure', actions_correctives: 'Contrôle de la check-list avant départ.', statut: 'clos' },
  { etablissement_id: etab.id, date_evenement: jours(-4), type: 'Matériel', description: 'Fauteuil en panne chez un patient.', gravite: 'moyenne', actions_correctives: null, statut: 'ouvert' },
]), 'événements')
ok(await db.from('registre_reclamations').insert([
  { etablissement_id: etab.id, date_reclamation: jours(-15), nature: 'Délai', description: 'Livraison en retard de 2 jours.', reponse_apportee: 'Excuses et créneau prioritaire.', date_reponse: jours(-13), statut: 'clos' },
  { etablissement_id: etab.id, date_reclamation: jours(-2), nature: 'Facturation', description: 'Double facturation d\'une location.', statut: 'ouverte' },
]), 'réclamations')

writeFileSync(sortie, `MediReg — compte de test (rôle client)\nhttps://medireg.pro/login\nE-mail : ${email}\nMot de passe : ${motDePasse}\nClient : ${client.nom} (${client.id})\nCritères remplis : ${criteres.length}\n`, { mode: 0o600 })
console.log(`OK : client ${client.id}, ${criteres.length} critères, identifiants dans ${sortie}`)
