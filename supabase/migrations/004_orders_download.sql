-- LeSkud Beats — incrément atomique des téléchargements payants

create or replace function public.increment_order_item_download(p_order_item_id uuid)
returns table (
  ok boolean,
  download_count integer,
  max_downloads integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_max integer;
begin
  update public.order_items oi
  set download_count = oi.download_count + 1
  from public.orders o
  where oi.id = p_order_item_id
    and oi.order_id = o.id
    and o.status = 'paid'
    and oi.download_count < oi.max_downloads
  returning oi.download_count, oi.max_downloads into v_count, v_max;

  if found then
    return query select true, v_count, v_max;
  else
    return query select false, 0::integer, 0::integer;
  end if;
end;
$$;
