# Sekvenčni Diagrami

Ta dokument vsebuje glavne tokove interakcij med uporabnikom, spletnim vmesnikom, zalednim sistemom in zunanjimi storitvami sistema Confera. Diagrami so zapisani v Mermaid sintaksi, zato se lahko prikažejo neposredno v GitHubu in se kasneje po potrebi izvozijo kot PDF diagrami.

## Registracija in prijava uporabnika

```mermaid
sequenceDiagram
    actor U as Uporabnik
    participant FE as Spletni vmesnik Next.js
    participant Auth as Firebase avtentikacija
    participant API as Zaledni sistem NestJS
    participant DB as Firestore

    U->>FE: Odpre stran za registracijo ali prijavo
    U->>FE: Odda prijavne podatke ali OAuth prijavo
    FE->>Auth: Avtenticira uporabnika
    Auth-->>FE: Vrne ID žeton
    FE->>API: POST /auth/session z ID žetonom
    API->>Auth: Preveri ID žeton
    Auth-->>API: Vrne preverjeno identiteto
    API->>DB: Preveri, ali uporabniški profil obstaja

    alt Profil obstaja
        DB-->>API: Vrne obstoječi uporabniški profil
    else Prva prijava
        API->>DB: Ustvari osnovni uporabniški profil
        DB-->>API: Potrdi ustvarjanje profila
    end

    API-->>FE: Vrne kontekst prijavljenega uporabnika
    FE-->>U: Preusmeri uporabnika na nadzorno ploščo
```

## Posodobitev profila udeleženca

```mermaid
sequenceDiagram
    actor P as Udeleženec
    participant FE as Spletni vmesnik Next.js
    participant API as Zaledni sistem NestJS
    participant Auth as Firebase avtentikacija
    participant DB as Firestore

    P->>FE: Uredi podatke profila
    FE->>FE: Preveri obvezna polja
    P->>FE: Shrani spremembe
    FE->>API: PATCH /users/me s podatki profila
    API->>Auth: Preveri žeton zahteve
    Auth-->>API: Vrne ID prijavljenega uporabnika
    API->>API: Preveri vlogo, oznake in razpoložljivost
    API->>DB: Posodobi users/{userId}
    DB-->>API: Potrdi posodobitev
    API-->>FE: Vrne posodobljen profil
    FE-->>P: Prikaže shranjen profil
```

## Zahteva za AI ujemanje

```mermaid
sequenceDiagram
    actor P as Udeleženec
    participant FE as Spletni vmesnik Next.js
    participant API as Zaledni sistem NestJS
    participant DB as Firestore
    participant Match as Storitev za ujemanje

    P->>FE: Odpre stran s priporočili
    FE->>API: GET /matches/me
    API->>DB: Naloži profil trenutnega udeleženca
    API->>DB: Naloži profile kandidatov za ujemanje
    API->>DB: Naloži izbrane oznake
    API->>Match: Izračuna podobnost in kompatibilnost
    Match->>Match: Primerja oznake z hibridnim iskanjem
    Match-->>API: Vrne razvrščena ujemanja z razlagami
    API-->>FE: Vrne priporočene udeležence
    FE-->>P: Prikaže ujemanja in razloge zanje
```

## Razporejanje srečanja

```mermaid
sequenceDiagram
    actor Req as Udeleženec, ki zahteva srečanje
    actor Inv as Povabljeni udeleženec
    participant FE as Spletni vmesnik Next.js
    participant API as Zaledni sistem NestJS
    participant DB as Firestore
    participant Scheduler as Storitev za razporejanje
    participant Notify as Storitev za obveščanje

    Req->>FE: Zahteva srečanje z drugim udeležencem
    FE->>API: POST /meetings
    API->>DB: Naloži razpoložljivost obeh udeležencev
    API->>DB: Naloži razpoložljive prostore in termine konference
    API->>Scheduler: Poišče ustrezen termin in lokacijo

    alt Termin in prostor sta na voljo
        Scheduler-->>API: Vrne predlagan termin in lokacijo
        API->>DB: Ustvari srečanje v čakanju
        API->>Notify: Obvesti povabljenega udeleženca
        API-->>FE: Vrne srečanje v čakanju
        FE-->>Req: Prikaže čakanje na potrditev
        Inv->>FE: Sprejme povabilo na srečanje
        FE->>API: PATCH /meetings/{meetingId}/accept
        API->>DB: Označi srečanje kot potrjeno
        API->>Notify: Obvesti oba udeleženca
        API-->>FE: Vrne potrjeno srečanje
    else Ni ustreznega termina
        Scheduler-->>API: Vrne konflikt pri razporejanju
        API-->>FE: Vrne alternativne termine ali sporočilo o konfliktu
        FE-->>Req: Prikaže konflikt pri razporejanju
    end
```

## Uvoz udeležencev iz CSV

```mermaid
sequenceDiagram
    actor Org as Organizator
    participant AdminUI as Administratorski spletni vmesnik
    participant API as Zaledni sistem NestJS
    participant Auth as Firebase avtentikacija
    participant Importer as Storitev za uvoz
    participant DB as Firestore

    Org->>AdminUI: Naloži CSV datoteko z udeleženci
    AdminUI->>API: POST /imports/participants
    API->>Auth: Preveri žeton organizatorja oziroma administratorja
    Auth-->>API: Vrne preverjeno identiteto organizatorja
    API->>Importer: Prebere CSV po predpisani predlogi
    Importer->>Importer: Preveri glave stolpcev in obvezna polja

    alt CSV je veljaven
        Importer->>Importer: Normalizira vrstice udeležencev
        Importer-->>API: Vrne preverjene zapise udeležencev
        API->>DB: Paketno ustvari ali posodobi uporabniške profile
        DB-->>API: Potrdi paketni zapis
        API-->>AdminUI: Vrne povzetek uvoza
        AdminUI-->>Org: Prikaže uvožene in preskočene zapise
    else CSV ni veljaven
        Importer-->>API: Vrne napake validacije
        API-->>AdminUI: Vrne napake predloge ali posameznih vrstic
        AdminUI-->>Org: Prikaže podrobnosti neuspešnega uvoza
    end
```
