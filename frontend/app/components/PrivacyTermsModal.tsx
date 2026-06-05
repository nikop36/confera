'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  firstVisitTitle: string;
  firstVisitIntro: string;
  summaryTitle: string;
  summaryItems: string[];
  sections: LegalSection[];
  details: string;
  accept: string;
  close: string;
};

const CONTENT: Record<'sl' | 'en', LegalContent> = {
  sl: {
    eyebrow: 'Zasebnost in pogoji',
    title: 'Pred uporabo Confere',
    intro:
      'Confera obdeluje podatke, ki so potrebni za registracijo, profil, priporočila dogodkov, AI ujemanje udeležencev, povezave, povabila, obvestila in razporejanje srečanj.',
    notice:
      'To je delovni osnutek obvestila o zasebnosti in pogojev uporabe za aplikacijo. Pred produkcijsko uporabo mora organizator dogodka dodati svojo identiteto, kontakt za zahteve posameznikov in preveriti končno pravno besedilo.',
    firstVisitTitle: 'Najprej zasebnost',
    firstVisitIntro:
      'Da lahko ustvarimo profil, priporočila, povezave in razpored dogodka, Confera obdeluje omejen nabor osebnih in profilnih podatkov. Pred nadaljevanjem preberite povzetek in pogoje uporabe.',
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
    details: 'Prikaži celotno obvestilo',
    accept: 'Razumem in sprejemam',
    close: 'Zapri',
  },
  en: {
    eyebrow: 'Privacy and terms',
    title: 'Before using Confera',
    intro:
      'Confera processes data needed for registration, profiles, event recommendations, AI participant matching, connections, invites, notifications, and meeting scheduling.',
    notice:
      'This is a working draft privacy notice and terms text for the application. Before production use, the event organizer must add its controller identity, data-rights contact, and review the final legal wording.',
    firstVisitTitle: 'Privacy first',
    firstVisitIntro:
      'To create profiles, recommendations, connections, and event schedules, Confera processes a limited set of personal and profile data. Please review the summary and terms before continuing.',
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
    details: 'View full notice',
    accept: 'I understand and accept',
    close: 'Close',
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
  const [showDetails, setShowDetails] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    const accepted = window.localStorage.getItem(ACCEPTANCE_KEY) === 'accepted';
    const firstVisitTimer = accepted
      ? undefined
      : window.setTimeout(() => {
          setOpen(true);
        }, 900);

    const onOpen = () => {
      setManualOpen(true);
      setShowDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      if (firstVisitTimer) window.clearTimeout(firstVisitTimer);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  function accept() {
    window.localStorage.setItem(ACCEPTANCE_KEY, 'accepted');
    setOpen(false);
    setManualOpen(false);
    setShowDetails(false);
  }

  function close() {
    if (!manualOpen) return;
    setOpen(false);
    setManualOpen(false);
    setShowDetails(false);
  }

  const isCompactFirstVisit = !manualOpen && !showDetails;

  return (
    <div
      className={`fixed inset-0 z-[100] flex bg-[#0d0d0d]/25 px-4 py-6 backdrop-blur-[2px] ${
        isCompactFirstVisit
          ? 'items-end justify-center sm:items-center'
          : 'items-center justify-center'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-terms-title"
    >
      <motion.div
        initial={{
          opacity: 0,
          y: isCompactFirstVisit ? 36 : 18,
          scale: isCompactFirstVisit ? 1 : 0.98,
        }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={`w-full overflow-hidden bg-white text-[#0d0d0d] shadow-2xl ${
          isCompactFirstVisit
            ? 'max-w-[640px] rounded-t-[24px] sm:rounded-[24px]'
            : 'max-h-[88vh] max-w-[800px] rounded-[24px]'
        }`}
      >
        <div className="border-b border-[#f0f0f0] px-6 py-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7fa8c8]">
            {content.eyebrow}
          </p>
          <h2 id="privacy-terms-title" className="text-[24px] font-bold">
            {isCompactFirstVisit ? content.firstVisitTitle : content.title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6e6e73]">
            {isCompactFirstVisit ? content.firstVisitIntro : content.intro}
          </p>
        </div>

        <div
          className={`overflow-y-auto px-6 py-5 ${
            isCompactFirstVisit ? 'max-h-[42vh]' : 'max-h-[58vh]'
          }`}
        >
          <div className="mb-5 rounded-[16px] border border-[#dbeafe] bg-[#eff6ff] p-4">
            <h3 className="mb-2 text-[14px] font-bold text-[#1e40af]">
              {content.summaryTitle}
            </h3>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-[#1f2937]">
              {content.summaryItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          {showDetails && (
            <>
              <p className="mb-5 rounded-[14px] bg-[#fff7ed] p-3 text-[12px] leading-relaxed text-[#9a3412]">
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
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#f0f0f0] px-6 py-4">
          {!showDetails && (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="rounded-full border border-[#e5e7eb] bg-white px-5 py-2 text-[13px] font-semibold text-[#3d3d3d] hover:bg-[#f7f7f7]"
            >
              {content.details}
            </button>
          )}
          {manualOpen && (
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-[#e5e7eb] bg-white px-5 py-2 text-[13px] font-semibold text-[#3d3d3d] hover:bg-[#f7f7f7]"
            >
              {content.close}
            </button>
          )}
          <button
            type="button"
            onClick={accept}
            className="rounded-full border-0 bg-[#0d0d0d] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#1f1f1f]"
          >
            {content.accept}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
