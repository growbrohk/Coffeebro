-- Add code column to vouchers table
-- 8-character alphanumeric code (case sensitive, unique)

-- Check if column exists before adding
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vouchers'
      and column_name = 'code'
  ) then
    alter table public.vouchers add column code text null;
  end if;
end $$;

-- Generate codes for any existing vouchers with NULL codes
do $$
declare
  v_voucher record;
  v_code text;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_code_exists boolean;
begin
  for v_voucher in select id from public.vouchers where public.vouchers.code is null loop
    -- Generate unique code
    loop
      v_code := '';
      for i in 1..8 loop
        v_code := v_code || substr(v_chars, floor(random()*62)::int + 1, 1);
      end loop;

      -- Check if code already exists
      select exists(select 1 from public.vouchers where public.vouchers.code = v_code)
      into v_code_exists;

      exit when not v_code_exists;
    end loop;

    -- Update voucher with generated code
    update public.vouchers
    set code = v_code
    where public.vouchers.id = v_voucher.id;
  end loop;
end $$;

-- Create unique index on code (if it doesn't exist)
create unique index if not exists uq_vouchers_code on public.vouchers(code);

-- Now make code NOT NULL (all existing rows have codes)
-- Only if column is currently nullable
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vouchers'
      and column_name = 'code'
      and is_nullable = 'YES'
  ) then
    alter table public.vouchers alter column code set not null;
  end if;
end $$;
