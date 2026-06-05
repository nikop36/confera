'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocale } from '../lib/i18n';

const ACCEPTANCE_KEY = 'confera_privacy_terms_accepted_v1';
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
  summaryTitle: string;
  summaryItems: string[];
  sections: LegalSection[];
  accept: string;
  close: string;
  openLabel: string;
};

const CONTENT: Record<'sl' | 'en', LegalContent> = {
  sl: {
    eyebrow: 'Zasebnost in pogoji',
    title: 'Pred uporabo Confere',
    intro:
      'Confera obdeluje podatke, ki so potrebni za registracijo, profil, priporočila dogodkov, AI ujemanje udeležencev, povezave, povabila, obvestila in razporejanje srečanj.',
    notice:
      'To je delovni osnutek obvestila o zasebnosti in pogojev uporabe za aplikacijo. Pred produkcijsko uporabo mora organizator dogodka dodati svojo identiteto, kontakt za zahteve posameznikov in preveriti končno pravno besedilo.',
    summaryTitle: 'Kratek povzetek',
    summaryItems: [
      'Račun: ime, e-pošta, vloga, UID računa in podatki za prijavo prek Firebase.',
      'Profil: organizacija, opis, izbrane oznake, način srečanja ter slike, če jih dodate.',
      'Uporaba: prijave na dogodke, povezave, povabila, obvestila, zahteve za vloge, razporedi in čas zadnje aktivnosti.',
      'Namen: delovanje aplikacije, priporočila, AI ujemanje na osnovi oznak, varnost, administracija dogodka in osnovna statistika.',
    ],
    sections: [
      {
        title: 'Upravljavec in namen',
        items: [
          'Upravljavec osebnih podatkov je organizator oziroma institucija, ki uporablja to instanco Confere za posamezno konferenco ali dogodek.',
          'Confera je aplikacija za upravljanje konferenčnega mreženja: registracijo uporabnikov, profile, dogodke, povezave, povabila, obvestila, priporočila, AI ujemanje in razporejanje srečanj.',
          'Kontakt za uveljavljanje pravic posameznikov mora določiti organizator dogodka pred javno uporabo sistema.',
        ],
      },
      {
        title: 'Katere podatke obdelujemo',
        items: [
          'Identifikacijski podatki: ime, e-pošta, vloga uporabnika in UID računa.',
          'Profilni podatki: organizacija, opis, izbrane oznake, način srečanja in profilne slike, če jih uporabnik doda.',
          'Podatki o uporabi: prijave na dogodke, povezave, povabila, zahteve za vloge, obvestila, čas zadnje aktivnosti in administrativni zapisi.',
          'Tehnični podatki, ki jih zagotavljajo uporabljene storitve, kot so Firebase, Supabase in ponudnik e-pošte, kadar so omogočeni.',
        ],
      },
      {
        title: 'AI ujemanje, priporočila in avtomatizirana pomoč',
        items: [
          'Ujemanje temelji predvsem na izbranih oznakah profila in dogodkov.',
          'Sistem iz oznak zgradi iskalni oziroma embedding indeks, s katerim predlaga relevantne osebe in dogodke.',
          'Rezultati so priporočila za lažje mreženje. Ne pomenijo avtomatske pravne, zaposlitvene, finančne ali podobno pomembne odločitve o uporabniku.',
          'Uporabnik se sam odloči, ali bo priporočilo upošteval, poslal zahtevo za povezavo ali se prijavil na dogodek.',
        ],
      },
      {
        title: 'Pravna podlaga, hramba in deljenje',
        items: [
          'Podatki se obdelujejo za izvedbo storitve in pogodbenega oziroma uporabniškega razmerja, za zakonite interese organizacije dogodka in varnost sistema ter, kjer je potrebno, na podlagi privolitve.',
          'Podatke hranimo toliko časa, kot je potrebno za izvedbo dogodka, delovanje računa, reševanje zahtevkov, varnost, revizijske zapise in zakonske obveznosti.',
          'Podatke lahko obdelujejo tehnični ponudniki za avtentikacijo, bazo podatkov, shranjevanje slik, pošiljanje e-pošte, gostovanje in analitiko delovanja sistema.',
          'Podatkov ne prodajamo oglaševalcem in jih ne uporabljamo za vedenjsko oglaševanje.',
        ],
      },
      {
        title: 'Pravice uporabnika',
        items: [
          'Uporabnik ima pravico do obveščenosti, dostopa, popravka, izbrisa, omejitve obdelave, ugovora in prenosljivosti podatkov, kadar to velja po GDPR.',
          'Uporabnik lahko profilne podatke spremeni v aplikaciji; račun lahko izbriše v nastavitvah računa.',
          'Če obdelava temelji na privolitvi, jo lahko uporabnik prekliče. Preklic ne vpliva na zakonitost predhodne obdelave.',
          'Za dodatne zahteve glede osebnih podatkov se obrnite na organizatorja dogodka oziroma upravljavca te instance Confere.',
        ],
      },
      {
        title: 'Pogoji uporabe',
        items: [
          'Aplikacijo uporabljajte samo za namen konference, mreženja, dogodkov in povezanih administrativnih procesov.',
          'Uporabnik mora vnesti točne podatke in ne sme zlorabljati računov, profilov, povezav, povabil ali obvestil.',
          'Prepovedano je nadlegovanje, pošiljanje neželenih sporočil, lažno predstavljanje, poskus nepooblaščenega dostopa ali uporaba podatkov drugih uporabnikov izven namena dogodka.',
          'Organizator lahko omeji ali odstrani dostop v primeru zlorabe, varnostnega tveganja, kršitve pravil dogodka ali zahteve pristojnega organa.',
        ],
      },
    ],
    accept: 'Razumem in sprejemam',
    close: 'Zapri',
    openLabel: 'Zasebnost in pogoji',
  },
  en: {
    eyebrow: 'Privacy and terms',
    title: 'Before using Confera',
    intro:
      'Confera processes data needed for registration, profiles, event recommendations, AI participant matching, connections, invites, notifications, and meeting scheduling.',
    notice:
      'This is a working draft privacy notice and terms text for the application. Before production use, the event organizer must add its controller identity, data-rights contact, and review the final legal wording.',
    summaryTitle: 'Short summary',
    summaryItems: [
      'Account: name, email, user role, account UID, and Firebase sign-in data.',
      'Profile: organization, bio, selected tags, meeting type, and images if you add them.',
      'Usage: event registrations, connections, invites, notifications, role requests, schedules, and last activity time.',
      'Purpose: app operation, recommendations, tag-based AI matching, security, event administration, and basic statistics.',
    ],
    sections: [
      {
        title: 'Controller and purpose',
        items: [
          'The personal-data controller is the organizer or institution operating this Confera instance for a specific conference or event.',
          'Confera is an application for conference networking: user registration, profiles, events, connections, invites, notifications, recommendations, AI matching, and meeting scheduling.',
          'The event organizer must define the contact point for data-subject rights before public production use.',
        ],
      },
      {
        title: 'Data we process',
        items: [
          'Identity data: name, email, user role, and account UID.',
          'Profile data: organization, bio, selected tags, meeting type, and profile images if added by the user.',
          'Usage data: event registrations, connections, invites, role requests, notifications, last activity time, and administrative records.',
          'Technical data provided by enabled services such as Firebase, Supabase, and the email provider.',
        ],
      },
      {
        title: 'AI matching, recommendations, and automated assistance',
        items: [
          'Matching is based mainly on selected profile and event tags.',
          'The system builds a search or embedding index from tags to recommend relevant people and events.',
          'Results are networking recommendations. They are not automatic legal, employment, financial, or similarly significant decisions about the user.',
          'The user decides whether to follow a recommendation, send a connection request, or register for an event.',
        ],
      },
      {
        title: 'Legal basis, retention, and sharing',
        items: [
          'Data is processed to provide the service and user relationship, for legitimate event-organization interests and system security, and, where required, user consent.',
          'Data is retained for as long as needed to run the event, operate the account, resolve requests, maintain security, keep audit records, and meet legal obligations.',
          'Data may be processed by technical providers for authentication, database storage, image storage, email delivery, hosting, and system-operation analytics.',
          'We do not sell data to advertisers and do not use it for behavioural advertising.',
        ],
      },
      {
        title: 'User rights',
        items: [
          'Users have rights to information, access, rectification, erasure, restriction, objection, and portability where applicable under GDPR.',
          'Users can edit profile data in the app; account deletion is available in account settings.',
          'Where processing is based on consent, the user may withdraw it. Withdrawal does not affect processing that already happened lawfully.',
          'For additional personal-data requests, contact the event organizer or controller operating this Confera instance.',
        ],
      },
      {
        title: 'Terms of use',
        items: [
          'Use the app only for conference, networking, event, and related administrative purposes.',
          'Users must provide accurate information and must not misuse accounts, profiles, connections, invites, or notifications.',
          'Harassment, spam, impersonation, unauthorized-access attempts, or using other users’ data outside the event purpose is prohibited.',
          'The organizer may restrict or remove access in case of misuse, security risk, breach of event rules, or a lawful authority request.',
        ],
      },
    ],
    accept: 'I understand and accept',
    close: 'Close',
    openLabel: 'Privacy and terms',
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

  function accept() {
    window.localStorage.setItem(ACCEPTANCE_KEY, 'accepted');
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
                  onClick={accept}
                  className="rounded-full border-0 bg-[#0d0d0d] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#1f1f1f]"
                >
                  {content.accept}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
