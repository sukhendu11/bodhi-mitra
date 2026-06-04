
create or replace function public.get_admin_claim_status()
returns table(admin_exists boolean, is_admin boolean, user_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  return query
    select
      exists(select 1 from public.user_roles where role = 'admin') as admin_exists,
      exists(select 1 from public.user_roles where role = 'admin' and user_roles.user_id = uid) as is_admin,
      uid as user_id;
end;
$$;

create or replace function public.claim_admin_role()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  any_admin boolean;
  mine boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select exists(select 1 from public.user_roles where role = 'admin') into any_admin;
  select exists(select 1 from public.user_roles where role = 'admin' and user_id = uid) into mine;

  if any_admin then
    if mine then
      return json_build_object('ok', true, 'alreadyAdmin', true);
    end if;
    raise exception 'An admin has already been assigned. Ask the existing admin to grant you access.';
  end if;

  insert into public.user_roles(user_id, role) values (uid, 'admin');
  return json_build_object('ok', true, 'alreadyAdmin', false);
end;
$$;

grant execute on function public.get_admin_claim_status() to authenticated;
grant execute on function public.claim_admin_role() to authenticated;
