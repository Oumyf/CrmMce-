-- Allow authenticated users to insert notifications for any profile
-- (needed for @mentions in comments, project assignments, etc.)
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
