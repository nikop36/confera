# Baze podatkov

## Pregled

Sistem Confera uporablja tri ločene podatkovne komponente:

- **Firebase Firestore** — operativni podatki
- **Supabase PostgreSQL + pgvector** — AI matching
- **Supabase Storage** — shranjevanje slik (profilne slike, logotipi razstavljalcev)

Ločitev omogoča boljšo zmogljivost, skalabilnost in optimizacijo za različne tipe podatkov.

---

## 1. Firebase Firestore (operativni podatki)

### Namen
Hramba podatkov, ki se pogosto berejo in pišejo med konferenco.

### Shranjuje
- uporabniške profile  
- dogodke  
- termine  
- prostore  
- srečanja  
- sejem in razstavišča  
- karierne razgovore  

### Prednosti
- nizka latenca  
- fleksibilna NoSQL struktura  
- integracija z Firebase Auth  
- avtomatske varnostne kopije  

---

## 2. Supabase PostgreSQL + pgvector (AI matching)

### Namen
Izvajanje vektorskega iskanja in AI matchinga.

### Shranjuje
- embeddings profilov  
- rezultate ujemanj  
- metapodatke o podobnosti  

### Prednosti
- pgvector razširitev za hitro podobnostno iskanje  
- podpora za HNSW/IVFFlat indekse  
- SQL poizvedbe za analitiko  
- ločen sistem, ki ne obremenjuje Firestore  

---

## 3. Supabase Storage (slike in datoteke)

### Namen
Hramba statičnih datotek, ki jih nalagajo uporabniki ali organizatorji.

### Shranjuje
- profilne slike udeležencev  
- logotipe podjetij in razstavljalcev  
- morebitne dodatne datoteke (npr. predstavitvene slike sejma)

### Prednosti
- integracija z Supabase Auth in API  
- javni ali zaščiteni bucketi  
- enostavno nalaganje prek frontend SDK  
- hitra dostava prek CDN  

### Konfiguracija
- Ime bucket-a je definirano v `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET`
- URL-ji datotek se shranjujejo v Firebase profilni dokument

---

## 4. Varnost in dostop

- Dostop do Firestore prek Firebase Admin SDK  
- Dostop do Supabase PostgreSQL prek service key (varno shranjen v `.env`)  
- Dostop do Supabase Storage prek anon/service ključev  
- Vsi podatki se prenašajo prek HTTPS  
- Varnostne kopije se izvajajo v oblaku  


