# Nefunkcionalne zahteve

## 1. Zmogljivost

- Odzivni čas API mora biti < **500 ms** za ključne operacije.
- AI matching mora biti izračunan v < **2 sekundah** za do **1000 udeležencev**.
- Sistem mora podpirati **500–1000 hkratnih uporabnikov**.

---

## 2. Razpoložljivost in zanesljivost

- Sistem mora biti dostopen vsaj **99% časa** med konferenco.
- Kritične operacije (matching, razporejanje) morajo imeti mehanizme za ponovni poskus.

---

## 3. Varnost

- Avtentikacija prek Firebase Auth.
- Vsi API klici morajo biti zaščiteni z JWT.
- Vsi podatki morajo biti prenašani prek HTTPS.
- Uporabniški podatki morajo biti shranjeni v varnem oblaku (Firebase/Supabase).

---

## 4. Skalabilnost

- Frontend in backend morata omogočati horizontalno skaliranje.
- Supabase mora podpirati povečanje števila embeddingov brez degradacije zmogljivosti.

---

## 5. Vzdrževanje in nadgradljivost

- Koda mora slediti načelom modularnosti (NestJS moduli).
- Sistem mora omogočati enostavno dodajanje novih profilnih oznak, vlog in kriterijev matchinga.
- Dokumentacija mora biti vzdrževana v `docs/`.

---

## 6. Uporabniška izkušnja

- UI mora biti odziven in prilagojen različnim napravam.
- Navigacija mora biti intuitivna.
- Sistem mora prikazati jasne napake in validacijska sporočila.

---

## 7. Testiranje

- Sistem mora imeti pokritost z unit testi za ključne module.
- Integracijski testi morajo pokrivati uvoz podatkov in matching.
- E2E testi morajo pokrivati glavne uporabniške tokove.

---

## 8. Skladnost in zasebnost

- Podatki morajo biti obdelani skladno z GDPR.
- Uporabnik mora imeti možnost izbrisa profila.
