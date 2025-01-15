-- Удаляем бакет, если он существует
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Function Upload" on storage.objects;
delete from storage.buckets where id = 'webapp';

-- Создаем бакет
insert into storage.buckets (id, name, public)
values ('webapp', 'webapp', true);

-- Разрешаем публичный доступ на чтение
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'webapp' );

-- Разрешаем загрузку файлов через Edge Function
create policy "Function Upload"
  on storage.objects for insert
  with check ( bucket_id = 'webapp' );

-- Разрешаем обновление файлов
create policy "Function Update"
  on storage.objects for update
  using ( bucket_id = 'webapp' )
  with check ( bucket_id = 'webapp' );

-- Включаем RLS
alter table storage.objects enable row level security; 