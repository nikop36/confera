export type ProfileTaxonomyGroup = {
  title: string;
  options: string[];
};

export const INTEREST_GROUPS: ProfileTaxonomyGroup[] = [
  {
    title: 'Tehnologija',
    options: [
      'Umetna inteligenca',
      'Strojno učenje',
      'Robotika',
      'Podatkovna znanost',
      'Kibernetska varnost',
      'Razvoj programske opreme',
      'Digitalizacija',
      'Pametne naprave',
      'Računalniški vid',
      'NLP',
      'Blockchain',
      'Internet stvari',
    ],
  },
  {
    title: 'Naravoslovje',
    options: [
      'Kemija',
      'Biologija',
      'Fizika',
      'Matematika',
      'Biotehnologija',
      'Materiali',
      'Okoljske znanosti',
      'Laboratorijske raziskave',
    ],
  },
  {
    title: 'Medicina in zdravje',
    options: [
      'Medicina',
      'Farmacija',
      'Digitalno zdravje',
      'Javno zdravje',
      'Psihologija',
      'Prehrana',
      'Rehabilitacija',
      'Zdravstvena nega',
    ],
  },
  {
    title: 'Pravo in regulativa',
    options: [
      'Pravo',
      'Varstvo podatkov',
      'Intelektualna lastnina',
      'Regulativa AI',
      'Delovno pravo',
      'Javna naročila',
      'Skladnost poslovanja',
      'Etika in zakonodaja',
    ],
  },
  {
    title: 'Družba in javni sektor',
    options: [
      'Javna uprava',
      'Izobraževanje',
      'Zdravstvo',
      'Pametna mesta',
      'Mobilnost',
      'Dostopnost',
      'Etika tehnologije',
      'Skupnostni projekti',
    ],
  },
  {
    title: 'Humanistika in kultura',
    options: [
      'Jeziki',
      'Zgodovina',
      'Filozofija',
      'Mediji',
      'Komuniciranje',
      'Kultura',
      'Umetnost',
      'Kreativne industrije',
    ],
  },
  {
    title: 'Posel in kariera',
    options: [
      'Podjetništvo',
      'Industrija 4.0',
      'Marketing',
      'Prodaja',
      'Finance',
      'Kadrovanje',
      'Vodenje ekip',
      'Inovacije',
    ],
  },
  {
    title: 'Življenje in vrednote',
    options: [
      'Vzdržnost',
      'Okolje',
      'Kultura',
      'Umetnost',
      'Šport',
      'Dobro počutje',
      'Potovanja',
      'Osebni razvoj',
    ],
  },
  {
    title: 'Inženirstvo in proizvodnja',
    options: [
      'Strojništvo',
      'Elektrotehnika',
      'Gradbeništvo',
      'Logistika',
      'Avtomatizacija proizvodnje',
      'Energetika',
      'Kakovost',
      'Varnost pri delu',
    ],
  },
];

export const GOAL_GROUPS: ProfileTaxonomyGroup[] = [
  {
    title: 'Sodelovanje',
    options: [
      'Raziskovalno sodelovanje',
      'Industrijsko partnerstvo',
      'Pilotni projekt',
      'Skupna prijava na razpis',
      'Razvoj nove ideje',
    ],
  },
  {
    title: 'Kariera',
    options: [
      'Karierne priložnosti',
      'Iskanje mentorja',
      'Iskanje kandidatov',
      'Praksa',
      'Zaposlitev',
    ],
  },
  {
    title: 'Mreženje',
    options: [
      'Izmenjava znanja',
      'Akademsko mreženje',
      'Spoznavanje ljudi iz drugih sektorjev',
      'Predstavitev projekta',
      'Investitorji',
    ],
  },
];

export const COMPETENCY_GROUPS: ProfileTaxonomyGroup[] = [
  {
    title: 'Tehnične',
    options: [
      'Razvoj programske opreme',
      'Frontend',
      'Backend',
      'Podatkovna analiza',
      'Strojno učenje',
      'DevOps',
      'Sistemska arhitektura',
    ],
  },
  {
    title: 'Raziskovalne in strokovne',
    options: [
      'Raziskovalno delo',
      'Pisanje člankov',
      'Analiza potreb',
      'Evalvacija rešitev',
      'Delo z uporabniki',
      'Javne politike',
    ],
  },
  {
    title: 'Mehke veščine',
    options: [
      'Vodenje projektov',
      'Produktno vodenje',
      'Poslovni razvoj',
      'Javno nastopanje',
      'Mentorstvo',
      'Komunikacija',
      'Organizacija dogodkov',
    ],
  },
];

export const KEYWORD_GROUPS: ProfileTaxonomyGroup[] = [
  {
    title: 'AI in podatki',
    options: [
      'LLM',
      'Generativna AI',
      'Priporočilni sistemi',
      'Vektorske baze',
      'Semantično iskanje',
      'Analitika',
    ],
  },
  {
    title: 'Uporaba v praksi',
    options: [
      'Optimizacija procesov',
      'E-uprava',
      'Pametna industrija',
      'Avtomatizacija',
      'Digitalna transformacija',
      'Kadrovanje',
    ],
  },
  {
    title: 'Širši kontekst',
    options: [
      'Trajnost',
      'Varnost',
      'Etika',
      'Uporabniška izkušnja',
      'Družbeni vpliv',
      'Medsektorsko sodelovanje',
    ],
  },
];
