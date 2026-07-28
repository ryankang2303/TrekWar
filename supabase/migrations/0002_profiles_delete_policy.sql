-- Lets a user delete their own profile row (needed for the in-app dev
-- "reset profile" tool used to re-test the create-profile flow without a
-- fresh Apple ID each time).
create policy "users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);
