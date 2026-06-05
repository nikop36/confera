'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocale } from '../lib/i18n';

const ACKNOWLEDGEMENT_KEY = 'confera_legal_notice_read_v2';
const OPEN_EVENT = 'confera:legal-open';

type LegalSection = {
  title: string;
  items: string[];
};

type LegalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  notice: string;
  version: string;
  summaryTitle: string;
  summaryItems: string[];
  sections: LegalSection[];
  acknowledge: string;
  close: string;
  openLabel: string;
};

const CONTENT: Record<'sl' | 'en', LegalContent> = {
  sl: {
    eyebrow: 'Pravne informacije',
    title: 'Zasebnost in pogoji uporabe',
    intro:
      'To obvestilo pojasnjuje, kako se v Conferi obdelujejo osebni podatki, kako delujejo priporočila ter katera pravila veljajo pri uporabi aplikacije.',
    notice:
      'Pomembno: pred javno uporabo mora organizator v gradivih dogodka navesti svoje polno pravno ime, naslov, kontakt za varstvo osebnih podatkov in, kadar je imenovana, pooblaščeno osebo za varstvo podatkov.',
    version: 'Različica 2.0 · velja od 5. junija 2026',
    summaryTitle: 'Na kratko',
    summaryItems: [
      'Obdelujemo podatke, ki so potrebni za račun, profil, dogodke, povezovanje in razporejanje srečanj.',
      'Priporočila temeljijo predvsem na oznakah profila in dogodkov; o povezavi ali prijavi vedno odločite sami.',
      'Podatkov ne prodajamo in jih ne uporabljamo za vedenjsko oglaševanje.',
      'Svoj profil lahko popravite, račun pa izbrišete v nastavitvah.',
    ],
    sections: [
      {
        title: '1. Upravljavec in kontakt',
        items: [
          'Upravljavec osebnih podatkov je organizator oziroma institucija, ki uporablja to namestitev Confere za svoj dogodek.',
          'Pravno ime, naslov in kontakt upravljavca morajo biti objavljeni v uradnih informacijah ali registracijskem gradivu konkretnega dogodka.',
          'Zahteve glede osebnih podatkov pošljite na kontakt za zasebnost, ki ga objavi organizator. Če je imenovana pooblaščena oseba za varstvo podatkov, organizator objavi tudi njen kontakt.',
        ],
      },
      {
        title: '2. Podatki, ki jih obdelujemo',
        items: [
          'Podatki računa: ime, e-poštni naslov, uporabniška vloga, enolični identifikator računa in podatki, potrebni za varno prijavo.',
          'Podatki profila: organizacija, predstavitev, interesne oznake, želeni način srečanja ter profilne slike, kadar jih dodate.',
          'Podatki o dejavnosti: prijave na dogodke in termine, povezave, povabila, obvestila, zahteve za vloge, razporedi, odzivi in čas zadnje aktivnosti.',
          'Tehnični in varnostni podatki: dnevniki dostopa, podatki o napakah ter podatki, ki jih ustvarijo ponudniki avtentikacije, gostovanja, podatkovne zbirke, shranjevanja slik in e-pošte.',
        ],
      },
      {
        title: '3. Nameni in pravne podlage',
        items: [
          'Izvajanje storitve: registracija, upravljanje računa, dogodkov, povezav, povabil in srečanj. Pravna podlaga je izvajanje uporabniškega razmerja oziroma ukrepov na vašo zahtevo.',
          'Varnost, preprečevanje zlorab, administracija dogodka in omejena statistika delovanja. Pravna podlaga je zakoniti interes upravljavca za varno in učinkovito izvedbo dogodka.',
          'Izpolnjevanje zakonskih obveznosti in obravnava zahtevkov. Pravna podlaga je veljavna pravna obveznost upravljavca.',
          'Kadar je za dodatno, neobvezno obdelavo potrebna privolitev, bo ta zahtevana ločeno in jo boste lahko preklicali brez vpliva na zakonitost predhodne obdelave.',
        ],
      },
      {
        title: '4. Priporočila in AI ujemanje',
        items: [
          'Confera primerja predvsem izbrane oznake profila, oznake dogodkov in osnovni opis profila, da razvrsti relevantne osebe in dogodke.',
          'Za iskanje podobnosti se lahko ustvarijo matematične predstavitve besedila oziroma embeddingi. Ti se uporabljajo za razvrščanje priporočil, ne za ugotavljanje občutljivih osebnih lastnosti.',
          'Priporočila nimajo pravnih ali podobno pomembnih učinkov. Sistem samodejno ne sklene povezave, ne prijavi uporabnika na dogodek in ne sprejme zaposlitvene ali druge pomembne odločitve.',
          'Končno odločitev vedno sprejme uporabnik. Kakovost priporočil lahko izboljšate ali omejite s spreminjanjem podatkov in oznak v profilu.',
        ],
      },
      {
        title: '5. Obvezni in neobvezni podatki',
        items: [
          'Ime, e-poštni naslov in geslo so potrebni za ustvarjanje ter zaščito računa. Brez njih registracija ni mogoča.',
          'Organizacija, predstavitev, oznake, način srečanja in slike so praviloma neobvezni, vendar lahko nepopoln profil zmanjša kakovost priporočil in možnosti mreženja.',
          'Podatke vnašajte prostovoljno in ne vključujte posebnih vrst osebnih podatkov ali zaupnih informacij, ki niso potrebne za namen dogodka.',
        ],
      },
      {
        title: '6. Prejemniki, ponudniki in prenosi',
        items: [
          'Do podatkov dostopajo pooblaščene osebe organizatorja ter pogodbeni ponudniki, ki zagotavljajo avtentikacijo, podatkovno zbirko, gostovanje, shranjevanje slik in dostavo e-pošte.',
          'Med tehnične ponudnike lahko sodijo Firebase oziroma Google Cloud, Supabase, ponudnik gostovanja aplikacije in ponudnik e-pošte, odvisno od nastavitev konkretne namestitve.',
          'Če ponudnik obdeluje podatke zunaj Evropskega gospodarskega prostora, mora upravljavec zagotoviti ustrezno podlago in zaščitne ukrepe, na primer sklep o ustreznosti ali standardne pogodbene klavzule.',
          'Javni oziroma drugim udeležencem vidni so samo podatki, ki so potrebni za funkcije skupnosti in mreženja. Podatkov ne prodajamo tretjim osebam.',
        ],
      },
      {
        title: '7. Hramba in varnost',
        items: [
          'Podatki računa in profila se hranijo do izbrisa računa oziroma do zaključka obdobja, v katerem organizator omogoča uporabo dogodkovne platforme.',
          'Podatki o dogodkih, prijavah, povezavah in razporedih se hranijo toliko časa, kot je potrebno za izvedbo dogodka, podporo uporabnikom, reševanje sporov in dokumentiranje izvedbe.',
          'Varnostni in revizijski zapisi se hranijo omejeno obdobje, določeno glede na varnostna tveganja in zakonske obveznosti. Organizator mora pred produkcijo določiti konkretne roke hrambe.',
          'Uporabljajo se razumni tehnični in organizacijski ukrepi, vendar noben spletni sistem ne more zagotoviti popolne varnosti.',
        ],
      },
      {
        title: '8. Vaše pravice',
        items: [
          'Glede na okoliščine imate pravico do dostopa, popravka, izbrisa, omejitve obdelave, ugovora in prenosljivosti podatkov.',
          'Profilne podatke lahko popravite v aplikaciji, račun pa izbrišete v nastavitvah. Za druge zahteve se obrnite na kontakt za zasebnost organizatorja.',
          'Če menite, da se vaši podatki obdelujejo nezakonito, lahko vložite pritožbo pri Informacijskem pooblaščencu Republike Slovenije, Dunajska cesta 22, 1000 Ljubljana, gp.ip@ip-rs.si, www.ip-rs.si.',
          'Upravljavec lahko pred izvedbo zahteve preveri vašo identiteto in mora odgovoriti v rokih, ki jih določa GDPR.',
        ],
      },
      {
        title: '9. Pogoji uporabe',
        items: [
          'Aplikacijo uporabljajte samo za sodelovanje na dogodku, strokovno mreženje in povezane organizacijske postopke.',
          'Varujte svoje prijavne podatke, uporabljajte točne podatke in spoštujte zasebnost, dostojanstvo ter pravice drugih udeležencev.',
          'Prepovedani so nadlegovanje, neželena sporočila, lažno predstavljanje, avtomatizirano zbiranje podatkov, poskusi nepooblaščenega dostopa in uporaba podatkov udeležencev zunaj namena dogodka.',
          'Organizator lahko omeji ali odstrani dostop zaradi kršitve pravil, varnostnega tveganja, zaščite drugih uporabnikov ali izpolnitve zakonske obveznosti.',
          'Funkcije in razpoložljivost aplikacije se lahko spremenijo. Organizator si prizadeva za zanesljivo delovanje, vendar ne zagotavlja neprekinjene dostopnosti ali uspešnosti posameznega priporočila.',
        ],
      },
    ],
    acknowledge: 'Sprejmem',
    close: 'Zapri',
    openLabel: 'Pravne informacije',
  },
  en: {
    eyebrow: 'Legal information',
    title: 'Privacy notice and terms of use',
    intro:
      'This notice explains how personal data is processed in Confera, how recommendations work, and which rules apply when using the application.',
    notice:
      'Important: before public use, the organizer must provide its full legal name, address, privacy contact and, where appointed, the contact details of its data protection officer in the official event materials.',
    version: 'Version 2.0 · effective June 5, 2026',
    summaryTitle: 'At a glance',
    summaryItems: [
      'We process data needed for accounts, profiles, events, networking and meeting scheduling.',
      'Recommendations rely mainly on profile and event tags; you always decide whether to connect or register.',
      'We do not sell personal data or use it for behavioural advertising.',
      'You can correct your profile and delete your account in settings.',
    ],
    sections: [
      {
        title: '1. Controller and contact',
        items: [
          'The data controller is the organizer or institution operating this Confera installation for its event.',
          'The controller’s legal name, address and contact details must be published in the official information or registration materials for the relevant event.',
          'Send data-protection requests to the privacy contact published by the organizer. Where a data protection officer has been appointed, the organizer will also publish that contact.',
        ],
      },
      {
        title: '2. Data we process',
        items: [
          'Account data: name, email address, user role, unique account identifier and information needed for secure sign-in.',
          'Profile data: organization, biography, interest tags, preferred meeting type and profile images where provided.',
          'Activity data: event and slot registrations, connections, invites, notifications, role requests, schedules, responses and last activity time.',
          'Technical and security data: access logs, error information and data generated by authentication, hosting, database, image-storage and email providers.',
        ],
      },
      {
        title: '3. Purposes and legal bases',
        items: [
          'Providing the service: registration and management of accounts, events, connections, invites and meetings. The legal basis is performance of the user relationship or steps taken at your request.',
          'Security, abuse prevention, event administration and limited operational statistics. The legal basis is the controller’s legitimate interest in running a secure and effective event.',
          'Compliance with legal obligations and handling claims. The legal basis is the controller’s applicable legal obligation.',
          'Where consent is required for additional optional processing, it will be requested separately and may be withdrawn without affecting earlier lawful processing.',
        ],
      },
      {
        title: '4. Recommendations and AI matching',
        items: [
          'Confera primarily compares selected profile tags, event tags and basic profile descriptions to rank relevant people and events.',
          'Mathematical text representations, or embeddings, may be created to find similarities. They are used to rank recommendations, not to infer sensitive personal characteristics.',
          'Recommendations do not have legal or similarly significant effects. The system does not automatically create connections, register users for events or make employment or other significant decisions.',
          'The final decision always remains with the user. You can influence recommendation quality and scope by editing your profile information and tags.',
        ],
      },
      {
        title: '5. Required and optional data',
        items: [
          'Your name, email address and password are required to create and protect an account. Registration is not possible without them.',
          'Organization, biography, tags, meeting preference and images are generally optional, but an incomplete profile may reduce recommendation quality and networking functionality.',
          'Provide information voluntarily and do not include special-category personal data or confidential information that is unnecessary for the event.',
        ],
      },
      {
        title: '6. Recipients, providers and transfers',
        items: [
          'Data may be accessed by authorized organizer personnel and processors providing authentication, databases, hosting, image storage and email delivery.',
          'Technical providers may include Firebase or Google Cloud, Supabase, the application hosting provider and the email provider, depending on the configuration of the specific installation.',
          'Where a provider processes data outside the European Economic Area, the controller must ensure a valid transfer mechanism and safeguards, such as an adequacy decision or standard contractual clauses.',
          'Only information needed for community and networking functions is visible to other participants. Personal data is not sold to third parties.',
        ],
      },
      {
        title: '7. Retention and security',
        items: [
          'Account and profile data is retained until the account is deleted or until the organizer ends the period during which the event platform remains available.',
          'Event, registration, connection and schedule data is retained as needed to run the event, support users, resolve disputes and document delivery.',
          'Security and audit logs are kept for a limited period based on security risks and legal obligations. The organizer must define specific retention periods before production use.',
          'Reasonable technical and organizational safeguards are applied, but no online system can guarantee absolute security.',
        ],
      },
      {
        title: '8. Your rights',
        items: [
          'Depending on the circumstances, you may have rights of access, rectification, erasure, restriction, objection and data portability.',
          'You can edit profile information in the application and delete your account in settings. Contact the organizer’s privacy contact for other requests.',
          'If you believe your data is processed unlawfully, you may complain to the Information Commissioner of the Republic of Slovenia, Dunajska cesta 22, 1000 Ljubljana, gp.ip@ip-rs.si, www.ip-rs.si.',
          'The controller may verify your identity before fulfilling a request and must respond within the periods required by the GDPR.',
        ],
      },
      {
        title: '9. Terms of use',
        items: [
          'Use the application only to participate in the event, network professionally and complete related organizational processes.',
          'Protect your sign-in details, provide accurate information and respect the privacy, dignity and rights of other participants.',
          'Harassment, spam, impersonation, automated data collection, unauthorized-access attempts and use of participant data outside the event purpose are prohibited.',
          'The organizer may restrict or remove access to address rule violations, security risks, harm to other users or legal obligations.',
          'Features and availability may change. The organizer aims to provide a reliable service but does not guarantee uninterrupted access or the outcome of any recommendation.',
        ],
      },
    ],
    acknowledge: 'I accept',
    close: 'Close',
    openLabel: 'Legal information',
  },
};

export function openPrivacyTermsModal() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export default function PrivacyTermsModal() {
  const locale = useLocale();
  const content = useMemo(() => CONTENT[locale], [locale]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  function acknowledge() {
    window.localStorage.setItem(ACKNOWLEDGEMENT_KEY, 'read');
    setOpen(false);
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.8 : 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-5 right-5 z-[90] grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-[#111827] text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] outline-none transition-colors hover:bg-[#263449] focus-visible:ring-2 focus-visible:ring-[#7fa8c8] focus-visible:ring-offset-2 sm:bottom-7 sm:right-7"
        aria-label={content.openLabel}
        title={content.openLabel}
      >
        <span
          aria-hidden="true"
          className="grid h-6 w-6 place-items-center rounded-full border-2 border-current font-serif text-[15px] font-bold leading-none"
        >
          i
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0d0d0d]/35 px-3 py-3 backdrop-blur-[3px] sm:px-6 sm:py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-terms-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[800px] flex-col overflow-hidden rounded-[8px] bg-white text-[#0d0d0d] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
            >
              <div className="shrink-0 border-b border-[#f0f0f0] px-5 py-4 sm:px-6 sm:py-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5687ad]">
                  {content.eyebrow}
                </p>
                <h2
                  id="privacy-terms-title"
                  className="text-[22px] font-bold sm:text-[24px]"
                >
                  {content.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[#6e6e73] sm:text-[14px]">
                  {content.intro}
                </p>
                <p className="mt-3 text-[11px] font-medium text-[#8e8e93]">
                  {content.version}
                </p>
              </div>

              <div
                data-lenis-prevent
                className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-5 py-5 sm:px-6"
              >
                <div className="mb-5 rounded-[8px] border border-[#dbeafe] bg-[#eff6ff] p-4">
                  <h3 className="mb-2 text-[14px] font-bold text-[#1e40af]">
                    {content.summaryTitle}
                  </h3>
                  <ul className="space-y-1.5 text-[13px] leading-relaxed text-[#1f2937]">
                    {content.summaryItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <p className="mb-5 rounded-[8px] bg-[#fff7ed] p-3 text-[12px] leading-relaxed text-[#9a3412]">
                  {content.notice}
                </p>

                <div className="space-y-4">
                  {content.sections.map((section) => (
                    <section key={section.title}>
                      <h3 className="mb-2 text-[15px] font-bold">
                        {section.title}
                      </h3>
                      <ul className="space-y-1.5 text-[13px] leading-relaxed text-[#4b5563]">
                        {section.items.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#f0f0f0] px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[#e5e7eb] bg-white px-5 py-2 text-[13px] font-semibold text-[#3d3d3d] hover:bg-[#f7f7f7]"
                >
                  {content.close}
                </button>
                <button
                  type="button"
                  onClick={acknowledge}
                  className="rounded-full border-0 bg-[#0d0d0d] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#1f1f1f]"
                >
                  {content.acknowledge}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
