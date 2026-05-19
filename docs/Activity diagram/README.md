# Aktivnostni Diagrami

Ta dokument vsebuje glavne poslovne tokove sistema Confera. Diagrami so zapisani v Mermaid sintaksi kot `flowchart`, kar omogoča neposreden prikaz v GitHubu in kasnejši izvoz v PDF obliko.

## Proces AI Priporočanja Udeležencev

```mermaid
flowchart TD
    A([Začetek]) --> B["Udeleženec odpre stran s priporočili"]
    B --> C["Sistem naloži profil udeleženca"]
    C --> D{"Je profil dovolj izpolnjen?"}

    D -- "Ne" --> E["Sistem prikaže opozorilo za dopolnitev profila"]
    E --> Z([Konec])

    D -- "Da" --> F["Sistem naloži profile ostalih udeležencev"]
    F --> G["Sistem izloči neustrezne kandidate"]
    G --> I["Sistem preveri časovno razpoložljivost"]
    I --> H["Sistem primerja interese, kompetence, cilje in vloge"]
    H --> J["Sistem izračuna oceno ujemanja"]
    J --> K{"Ali obstajajo primerna ujemanja?"}

    K -- "Ne" --> L["Sistem prikaže sporočilo, da trenutno ni priporočil"]
    L --> Z

    K -- "Da" --> M["Sistem razvrsti priporočene udeležence"]
    M --> N["Sistem pripravi razlago ujemanja"]
    N --> O["Udeleženec pregleda priporočila"]
    O --> P{"Ali želi predlagati srečanje?"}

    P -- "Ne" --> Z
    P -- "Da" --> Q["Udeleženec sproži zahtevo za srečanje"]
    Q --> Z
```

## Proces Razporejanja Srečanja

```mermaid
flowchart TD
    A([Začetek]) --> B["Udeleženec izbere drugega udeleženca"]
    B --> C["Udeleženec pošlje zahtevo za srečanje"]
    C --> D["Sistem naloži razpoložljivost obeh udeležencev"]
    D --> E["Sistem naloži razpoložljive termine in prostore"]
    E --> F{"Ali obstaja skupen prost termin?"}

    F -- "Ne" --> G["Sistem prikaže konflikt razpoložljivosti"]
    G --> Z([Konec])

    F -- "Da" --> H{"Ali je na voljo ustrezen prostor?"}
    H -- "Ne" --> I["Sistem poišče alternativni termin ali prostor"]
    I --> J{"Ali obstaja alternativa?"}

    J -- "Ne" --> K["Sistem prikaže, da srečanja ni mogoče razporediti"]
    K --> Z

    J -- "Da" --> L["Sistem predlaga termin in lokacijo"]
    H -- "Da" --> L

    L --> M["Sistem ustvari srečanje s statusom v čakanju"]
    M --> N["Sistem obvesti povabljenega udeleženca"]
    N --> O{"Ali povabljeni udeleženec sprejme srečanje?"}

    O -- "Ne" --> P["Sistem označi srečanje kot zavrnjeno"]
    P --> Z

    O -- "Da" --> Q["Sistem potrdi srečanje"]
    Q --> R["Sistem obvesti oba udeleženca"]
    R --> Z
```

## Proces Uvoza Udeležencev Iz CSV

```mermaid
flowchart TD
    A([Začetek]) --> B["Organizator odpre administratorski vmesnik"]
    B --> D["Sistem preveri pravice organizatorja"]
    D --> E{"Ali ima uporabnik dovoljenje za uvoz?"}

    E -- "Ne" --> F["Sistem zavrne dostop"]
    F --> Z([Konec])

    E -- "Da" --> C["Organizator naloži CSV datoteko (email, prikazno ime)"]
    C --> G["Sistem prebere in validira CSV"]
    G --> H{"Ali je struktura datoteke pravilna?"}

    H -- "Ne" --> I["Sistem prikaže napako strukture"]
    I --> Z

    H -- "Da" --> J["Sistem preveri vsak e-poštni naslov"]
    J --> K["Že registrirani → dodani na seznam udeležencev brez sprememb"]
    K --> L["Že uvoženi (gostujoči zapis obstaja) → preskočeni"]
    L --> M["Novi naslovi → sistem ustvari gostujoče zapise s prikaznim imenom"]
    M --> N["Sistem pripravi povzetek uvoza"]
    N --> O["Organizator pregleda rezultat: uvoženi, že registrirani, preskočeni, neveljavni"]
    O --> Z
```

## Proces Dopolnitve Profila

```mermaid
flowchart TD
    A([Začetek]) --> B["Uporabnik se prijavi in dostopa do aplikacije"]
    B --> C{"profileStatus == 'complete'?"}

    C -- "Da" --> D["Profil je indeksiran v AI ujemanju"]
    D --> Z([Konec])

    C -- "Ne" --> E["Uporabnik še vedno uporablja aplikacijo"]
    E --> F["Sistem ne vključi profila v AI ujemanje"]
    F --> G{"Ali uporabnik izpolni profilna polja?"}

    G -- "Ne" --> Z

    G -- "Da" --> H["Sistem shrani profil"]
    H --> I["Sistem nastavi profileStatus na 'complete'"]
    I --> J["Sistem indeksira profil za AI ujemanje"]
    J --> Z
```

## Proces Prijave Na Karierni Razgovor

```mermaid
flowchart TD
    A([Začetek]) --> B["Predstavnik podjetja objavi termine razgovorov"]
    B --> C["Sistem shrani razpisane termine"]
    C --> D["Kandidat pregleda razpoložljive razgovore"]
    D --> E["Kandidat izbere podjetje in termin"]
    E --> F["Sistem preveri profil kandidata"]
    F --> G{"Ali kandidat izpolnjuje pogoje?"}

    G -- "Ne" --> H["Sistem prikaže razlog zavrnitve prijave"]
    H --> Z([Konec])

    G -- "Da" --> I["Sistem preveri razpoložljivost termina"]
    I --> J{"Ali je termin še prost?"}

    J -- "Ne" --> K["Sistem predlaga druge razpoložljive termine"]
    K --> E

    J -- "Da" --> L["Sistem ustvari prijavo kandidata"]
    L --> M["Predstavnik podjetja pregleda prijavo"]
    M --> N{"Ali podjetje potrdi prijavo?"}

    N -- "Ne" --> O["Sistem označi prijavo kot zavrnjeno"]
    O --> P["Sistem obvesti kandidata"]
    P --> Z

    N -- "Da" --> Q["Sistem dodeli prostor in potrdi razgovor"]
    Q --> R["Sistem obvesti kandidata in podjetje"]
    R --> Z
```
