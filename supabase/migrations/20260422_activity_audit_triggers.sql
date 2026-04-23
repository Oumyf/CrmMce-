-- ============================================================
-- AUDIT TRIGGERS — Historique automatique pour toutes les tables
-- Similaire à lead_audit_logs des Prospects, géré côté DB
-- ⚠️  À exécuter dans l'éditeur SQL Supabase avant utilisation
-- ============================================================

-- ── 1. Créer/adapter la table activity_logs ──────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  entity_name text NOT NULL,
  action      text NOT NULL,         -- 'created' | 'updated' | 'deleted'
  details     text,                  -- diff "Champ: Ancienne valeur → Nouvelle valeur"
  user_id     uuid,
  user_name   text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read activity_logs"   ON activity_logs;
DROP POLICY IF EXISTS "Authenticated can insert activity_logs" ON activity_logs;
CREATE POLICY "Authenticated can read activity_logs"
  ON activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert activity_logs"
  ON activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── 2. Fonction utilitaire : récupérer le nom de l'user courant ──
CREATE OR REPLACE FUNCTION get_current_user_name()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_uid  uuid;
  v_name text;
BEGIN
  v_uid := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  SELECT COALESCE(trim(first_name || ' ' || last_name), '') INTO v_name
  FROM profiles WHERE id = v_uid;
  RETURN COALESCE(NULLIF(trim(v_name), ''), 'Système');
EXCEPTION WHEN OTHERS THEN
  RETURN 'Système';
END;
$$;

-- ── 3. Fonction utilitaire : ajouter un champ au diff ──────────
-- Génère "Champ: Ancienne valeur → Nouvelle valeur"
CREATE OR REPLACE FUNCTION append_diff(current text, label text, old_val text, new_val text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF old_val IS DISTINCT FROM new_val THEN
    IF current = '' OR current IS NULL THEN
      RETURN label || ': ' || COALESCE(NULLIF(trim(old_val), ''), '—')
                    || ' → ' || COALESCE(NULLIF(trim(new_val), ''), '—');
    ELSE
      RETURN current || ' · ' || label || ': '
             || COALESCE(NULLIF(trim(old_val), ''), '—')
             || ' → ' || COALESCE(NULLIF(trim(new_val), ''), '—');
    END IF;
  END IF;
  RETURN current;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- TABLE : clients
-- Champs trackés : Prénom, Nom, Statut, Email, Téléphone,
--                  Domaine, Métier, Pays, Besoins
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_clients_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid     uuid;
  v_name    text;
  v_details text := '';
BEGIN
  v_uid  := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  v_name := get_current_user_name();

  IF TG_OP = 'INSERT' THEN
    v_details := 'Statut: ' || COALESCE(NEW.status, '—')
              || COALESCE(' · Email: '      || NULLIF(NEW.email, ''),      '')
              || COALESCE(' · Téléphone: '  || NULLIF(NEW.phone, ''),      '')
              || COALESCE(' · Pays: '       || NULLIF(NEW.country, ''),    '');
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('client', NEW.id::text,
            trim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')),
            'created', v_details, v_uid, v_name);

  ELSIF TG_OP = 'UPDATE' THEN
    v_details := append_diff(v_details, 'Prénom',     OLD.first_name,  NEW.first_name);
    v_details := append_diff(v_details, 'Nom',        OLD.last_name,   NEW.last_name);
    v_details := append_diff(v_details, 'Statut',     OLD.status,      NEW.status);
    v_details := append_diff(v_details, 'Email',      OLD.email,       NEW.email);
    v_details := append_diff(v_details, 'Téléphone',  OLD.phone,       NEW.phone);
    v_details := append_diff(v_details, 'Domaine',    OLD.domain,      NEW.domain);
    v_details := append_diff(v_details, 'Métier',     OLD.profession,  NEW.profession);
    v_details := append_diff(v_details, 'Pays',       OLD.country,     NEW.country);
    v_details := append_diff(v_details, 'Besoins',    OLD.needs,       NEW.needs);
    IF v_details = '' THEN v_details := 'Informations mises à jour'; END IF;
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('client', NEW.id::text,
            trim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')),
            'updated', v_details, v_uid, v_name);

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('client', OLD.id::text,
            trim(COALESCE(OLD.first_name,'') || ' ' || COALESCE(OLD.last_name,'')),
            'deleted', NULL, v_uid, v_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS clients_audit_trigger ON clients;
CREATE TRIGGER clients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION trg_clients_audit();


-- ════════════════════════════════════════════════════════════════
-- TABLE : projects
-- Champs trackés : Nom, Statut, Client, Délai, Avancement,
--                  Pays, Description
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_projects_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid     uuid;
  v_name    text;
  v_details text := '';
BEGIN
  v_uid  := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  v_name := get_current_user_name();

  IF TG_OP = 'INSERT' THEN
    v_details := 'Statut: ' || COALESCE(NEW.status, '—')
              || ' · Client: ' || COALESCE(NEW.client_name, '—')
              || COALESCE(' · Pays: ' || NULLIF(NEW.country, ''), '')
              || COALESCE(' · Délai: ' || to_char(NEW.deadline::date, 'DD/MM/YYYY'), '');
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('project', NEW.id::text, COALESCE(NEW.name, 'Projet'), 'created', v_details, v_uid, v_name);

  ELSIF TG_OP = 'UPDATE' THEN
    v_details := append_diff(v_details, 'Nom',         OLD.name,             NEW.name);
    v_details := append_diff(v_details, 'Statut',      OLD.status,           NEW.status);
    v_details := append_diff(v_details, 'Client',      OLD.client_name,      NEW.client_name);
    v_details := append_diff(v_details, 'Délai',       OLD.deadline::text,   NEW.deadline::text);
    v_details := append_diff(v_details, 'Avancement',  OLD.progress::text || '%', NEW.progress::text || '%');
    v_details := append_diff(v_details, 'Pays',        OLD.country,          NEW.country);
    v_details := append_diff(v_details, 'Description', OLD.description,      NEW.description);
    IF v_details = '' THEN v_details := 'Informations mises à jour'; END IF;
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('project', NEW.id::text, COALESCE(NEW.name, 'Projet'), 'updated', v_details, v_uid, v_name);

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('project', OLD.id::text, COALESCE(OLD.name, 'Projet'), 'deleted', NULL, v_uid, v_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS projects_audit_trigger ON projects;
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION trg_projects_audit();


-- ════════════════════════════════════════════════════════════════
-- TABLE : tasks
-- Champs trackés : Nom, Statut, Priorité, Responsable,
--                  Échéance, Projet, Description
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_tasks_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid     uuid;
  v_name    text;
  v_details text := '';
BEGIN
  v_uid  := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  v_name := get_current_user_name();

  IF TG_OP = 'INSERT' THEN
    v_details := 'Statut: '   || COALESCE(NEW.status,   '—')
              || ' · Priorité: ' || COALESCE(NEW.priority, '—')
              || COALESCE(' · Projet: '      || NULLIF(NEW.project_name, ''), '')
              || COALESCE(' · Responsable: ' || NULLIF(NEW.owner_name,   ''), '');
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('task', NEW.id::text, COALESCE(NEW.name, 'Tâche'), 'created', v_details, v_uid, v_name);

  ELSIF TG_OP = 'UPDATE' THEN
    v_details := append_diff(v_details, 'Nom',          OLD.name,          NEW.name);
    v_details := append_diff(v_details, 'Statut',       OLD.status,        NEW.status);
    v_details := append_diff(v_details, 'Priorité',     OLD.priority,      NEW.priority);
    v_details := append_diff(v_details, 'Responsable',  OLD.owner_name,    NEW.owner_name);
    v_details := append_diff(v_details, 'Échéance',     OLD.end_date::text, NEW.end_date::text);
    v_details := append_diff(v_details, 'Projet',       OLD.project_name,  NEW.project_name);
    v_details := append_diff(v_details, 'Description',  OLD.description,   NEW.description);
    IF v_details = '' THEN v_details := 'Informations mises à jour'; END IF;
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('task', NEW.id::text, COALESCE(NEW.name, 'Tâche'), 'updated', v_details, v_uid, v_name);

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('task', OLD.id::text, COALESCE(OLD.name, 'Tâche'), 'deleted', NULL, v_uid, v_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tasks_audit_trigger ON tasks;
CREATE TRIGGER tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trg_tasks_audit();


-- ════════════════════════════════════════════════════════════════
-- TABLE : quotes
-- Champs trackés : Statut, Total, Client, Titre, Date d'expiration
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_quotes_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid     uuid;
  v_name    text;
  v_details text := '';
BEGIN
  v_uid  := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  v_name := get_current_user_name();

  IF TG_OP = 'INSERT' THEN
    v_details := 'Statut: '  || COALESCE(NEW.status, '—')
              || COALESCE(' · Total: ' || NEW.total_amount::text || ' €', '');
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('quote', NEW.id::text,
            'Devis ' || COALESCE(NEW.number, '') || ' — ' || COALESCE(NEW.client_name, ''),
            'created', v_details, v_uid, v_name);

  ELSIF TG_OP = 'UPDATE' THEN
    v_details := append_diff(v_details, 'Statut',      OLD.status,              NEW.status);
    v_details := append_diff(v_details, 'Total',       OLD.total_amount::text,  NEW.total_amount::text);
    v_details := append_diff(v_details, 'Client',      OLD.client_name,         NEW.client_name);
    v_details := append_diff(v_details, 'Titre',       OLD.title,               NEW.title);
    v_details := append_diff(v_details, 'Expiration',  OLD.expiry_date::text,   NEW.expiry_date::text);
    IF v_details = '' THEN v_details := 'Informations mises à jour'; END IF;
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('quote', NEW.id::text,
            'Devis ' || COALESCE(NEW.number, '') || ' — ' || COALESCE(NEW.client_name, ''),
            'updated', v_details, v_uid, v_name);

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('quote', OLD.id::text,
            'Devis ' || COALESCE(OLD.number, '') || ' — ' || COALESCE(OLD.client_name, ''),
            'deleted', NULL, v_uid, v_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS quotes_audit_trigger ON quotes;
CREATE TRIGGER quotes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION trg_quotes_audit();


-- ════════════════════════════════════════════════════════════════
-- TABLE : invoices
-- Champs trackés : Statut, Montant, Client, Échéance
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_invoices_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid     uuid;
  v_name    text;
  v_details text := '';
BEGIN
  v_uid  := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  v_name := get_current_user_name();

  IF TG_OP = 'INSERT' THEN
    v_details := 'Statut: '   || COALESCE(NEW.status, '—')
              || ' · Montant: ' || COALESCE(NEW.amount::text, '—')
              || COALESCE(' · Échéance: ' || NEW.due, '');
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('invoice', NEW.id::text,
            'Facture ' || COALESCE(NEW.num, '') || ' — ' || COALESCE(NEW.client, ''),
            'created', v_details, v_uid, v_name);

  ELSIF TG_OP = 'UPDATE' THEN
    v_details := append_diff(v_details, 'Statut',    OLD.status,       NEW.status);
    v_details := append_diff(v_details, 'Montant',   OLD.amount::text, NEW.amount::text);
    v_details := append_diff(v_details, 'Échéance',  OLD.due,          NEW.due);
    v_details := append_diff(v_details, 'Client',    OLD.client,       NEW.client);
    IF v_details = '' THEN v_details := 'Informations mises à jour'; END IF;
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('invoice', NEW.id::text,
            'Facture ' || COALESCE(NEW.num, '') || ' — ' || COALESCE(NEW.client, ''),
            'updated', v_details, v_uid, v_name);

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('invoice', OLD.id::text,
            'Facture ' || COALESCE(OLD.num, '') || ' — ' || COALESCE(OLD.client, ''),
            'deleted', NULL, v_uid, v_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS invoices_audit_trigger ON invoices;
CREATE TRIGGER invoices_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trg_invoices_audit();


-- ════════════════════════════════════════════════════════════════
-- TABLE : recruited_employees
-- Champs trackés : Prénom, Nom, Email, Rôle, Département,
--                  Type contrat, Téléphone
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_recruitment_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid     uuid;
  v_name    text;
  v_details text := '';
BEGIN
  v_uid  := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  v_name := get_current_user_name();

  IF TG_OP = 'INSERT' THEN
    v_details := 'Département: ' || COALESCE(NEW.department,    '—')
              || COALESCE(' · Contrat: ' || NULLIF(NEW.contract_type, ''), '')
              || COALESCE(' · Rôle: '    || NULLIF(NEW.role, ''),          '');
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('recruitment', NEW.id::text,
            trim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')),
            'created', v_details, v_uid, v_name);

  ELSIF TG_OP = 'UPDATE' THEN
    v_details := append_diff(v_details, 'Prénom',       OLD.first_name,    NEW.first_name);
    v_details := append_diff(v_details, 'Nom',          OLD.last_name,     NEW.last_name);
    v_details := append_diff(v_details, 'Email',        OLD.email,         NEW.email);
    v_details := append_diff(v_details, 'Téléphone',    OLD.phone,         NEW.phone);
    v_details := append_diff(v_details, 'Rôle',         OLD.role,          NEW.role);
    v_details := append_diff(v_details, 'Département',  OLD.department,    NEW.department);
    v_details := append_diff(v_details, 'Contrat',      OLD.contract_type, NEW.contract_type);
    IF v_details = '' THEN v_details := 'Informations mises à jour'; END IF;
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('recruitment', NEW.id::text,
            trim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')),
            'updated', v_details, v_uid, v_name);

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs(entity_type, entity_id, entity_name, action, details, user_id, user_name)
    VALUES ('recruitment', OLD.id::text,
            trim(COALESCE(OLD.first_name,'') || ' ' || COALESCE(OLD.last_name,'')),
            'deleted', NULL, v_uid, v_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS recruitment_audit_trigger ON recruited_employees;
CREATE TRIGGER recruitment_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON recruited_employees
  FOR EACH ROW EXECUTE FUNCTION trg_recruitment_audit();
