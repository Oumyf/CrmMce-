-- RLS policies for the clients table
-- Allows all authenticated users to read/insert
-- Allows admins (admin, administrateur, superadmin) OR the creator to update/delete

CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND LOWER(COALESCE(p.role, '')) IN ('admin', 'administrateur', 'superadmin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin() TO authenticated;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read clients"    ON clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients"  ON clients;
DROP POLICY IF EXISTS "Admins or creators can update clients"   ON clients;
DROP POLICY IF EXISTS "Admins or creators can delete clients"   ON clients;

-- Tous les utilisateurs connectés peuvent lire les clients
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- Tous les utilisateurs connectés peuvent créer un client
CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin ou créateur peut modifier
CREATE POLICY "Admins or creators can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_superadmin() OR created_by = auth.uid());

-- Admin ou créateur peut supprimer
CREATE POLICY "Admins or creators can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (public.is_admin_or_superadmin() OR created_by = auth.uid());
