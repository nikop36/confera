# Shranjevanje slik profila

Profilne in naslovne slike se shranjujejo v Supabase Storage. Firebase/Firestore
ostane glavni vir podatkov o uporabniku, zato se v profil shrani samo javni URL
slike in nastavitve prikaza.

## Tok podatkov

1. Uporabnik izbere profilno ali naslovno sliko.
2. Frontend prikaže predogled in omogoči nastavitev položaja ter povečave.
3. Po potrditvi se originalna slika naloži v Supabase Storage bucket.
4. Supabase vrne javni URL.
5. Ob shranjevanju profila se javni URL in nastavitve prikaza shranijo v
   `roleProfile` v Firestore.

## Supabase nastavitev

Priporočen bucket:

```text
pplProfilePics
```

Ker frontend nalaga slike neposredno z javnim anon ključem, mora bucket dovoliti
vstavljanje datotek. Za prototip je to sprejemljivo. Za produkcijo je boljša
rešitev nalaganje prek backend endpointa s servisnim ključem.

Primer SQL pravil za javno branje in anon nalaganje v bucket:

```sql
create policy "Public profile asset read"
on storage.objects for select
using (bucket_id = 'pplProfilePics');

create policy "Anon profile asset upload"
on storage.objects for insert
to anon
with check (bucket_id = 'pplProfilePics');
```

Če želite dovoliti prepisovanje obstoječih datotek:

```sql
create policy "Anon profile asset update"
on storage.objects for update
to anon
using (bucket_id = 'pplProfilePics')
with check (bucket_id = 'pplProfilePics');
```

## Frontend okoljske spremenljivke

V lokalni root `.env` datoteki ali okolju Docker Compose nastavite:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=pplProfilePics
```

Po spremembi env vrednosti ponovno zaženite frontend container.
