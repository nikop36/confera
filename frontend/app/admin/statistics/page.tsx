'use client';

import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Overview',
    description: 'Skupni pogled na vse statistične module.',
    href: '/admin/statistics',
  },
  {
    title: 'Operations',
    description: 'Zasedenost sob, potrjena srečanja, anomalije in drilldown.',
    href: '/admin/statistics/operations',
  },
  {
    title: 'Usage',
    description: 'Trend registracij in dokončanih profilov.',
    href: '/admin/statistics/usage',
  },
  {
    title: 'Matching',
    description: 'Konverzije iz povezav v srečanja in intervjuje.',
    href: '/admin/statistics/matching',
  },
  {
    title: 'Engagement',
    description: 'Obvestila, stopnja prebranosti in odziv na povabila.',
    href: '/admin/statistics/engagement',
  },
  {
    title: 'Reports',
    description: 'Izvoz poročil (JSON/CSV) za admin analizo.',
    href: '/admin/statistics/reports',
  },
];

export default function AdminStatisticsOverviewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[32px] font-bold tracking-tight">Statistics</h1>
        <p className="text-sm text-[#8e8e93] mt-1">
          Enoten pogled za operativno statistiko in analitiko.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-[12px] border border-[#ececec] bg-white p-4 no-underline hover:bg-[#fafafa] transition-colors"
          >
            <h2 className="text-[18px] font-semibold text-[#111827]">{section.title}</h2>
            <p className="mt-2 text-sm text-[#6b7280]">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
