-- Registres qualité (événements indésirables, réclamations, remises) :
-- un client ne voit et ne modifie que les lignes de ses établissements, un consultant voit tout.
-- Avant : evenements_indesirables avait la RLS sans aucune règle (illisible pour tous),
-- registre_reclamations et registre_remises n'avaient pas de RLS (lisibles sans connexion).

create or replace function public.est_mon_etablissement(etab uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from etablissements_psdm e
    join societes s on s.id = e.societe_id
    join profiles p on p.client_id = s.client_id
    where e.id = etab and p.id = auth.uid()
  ) or exists (select 1 from profiles where id = auth.uid() and role = 'consultant')
$$;

do $$
declare t text;
begin
  foreach t in array array['evenements_indesirables', 'registre_reclamations', 'registre_remises'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Acces registre" on public.%I', t);
    execute format('create policy "Acces registre" on public.%I for all to authenticated
      using (public.est_mon_etablissement(etablissement_id))
      with check (public.est_mon_etablissement(etablissement_id))', t);
  end loop;
end $$;
