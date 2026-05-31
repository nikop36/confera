'use client';

import { useState } from 'react';

type Props = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
};

const MONTHS_SL = [
  'Januar','Februar','Marec','April','Maj','Junij',
  'Julij','Avgust','September','Oktober','November','December',
];
const WEEKDAYS = ['Pon','Tor','Sre','Čet','Pet','Sob','Ned'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toStr(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function parseLocal(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}
function fmtShort(s: string) {
  const d = parseLocal(s);
  if (!d) return '—';
  return d.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DateRangePicker({ startDate, endDate, onChange, onClose }: Props) {
  const init = parseLocal(startDate) ?? new Date();
  const [year, setYear] = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth());
  const [step, setStep] = useState<'start' | 'end'>('start');
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function handleDay(day: number) {
    const d = toStr(year, month, day);
    if (step === 'start') {
      setStart(d); setEnd(''); setStep('end');
    } else {
      const s = d < start ? d : start;
      const e = d < start ? start : d;
      onChange(s, e);
      onClose();
    }
  }

  function classFor(day: number) {
    const d = toStr(year, month, day);
    const isS = d === start;
    const isE = d === end;
    const inR = start && end && d > start && d < end;
    if (isS || isE) return 'bg-[#0d0d0d] text-white font-bold rounded-full';
    if (inR) return 'bg-[#f3f4f6] text-[#0d0d0d] rounded-full';
    return 'text-[#374151] hover:bg-[#f3f4f6] rounded-full';
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[20px] p-5 shadow-xl flex flex-col gap-3 w-[300px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wide">
          {step === 'start' ? 'Izberite datum začetka' : 'Izberite datum konca'}
        </p>

        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <span className={step === 'start' ? 'text-[#0d0d0d]' : 'text-[#9ca3af]'}>{fmtShort(start)}</span>
          <span className="text-[#d1d5db]">→</span>
          <span className={step === 'end' ? 'text-[#0d0d0d]' : 'text-[#9ca3af]'}>{fmtShort(end)}</span>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] bg-transparent border-0 cursor-pointer font-sans text-[16px] text-[#6b7280]">
            ‹
          </button>
          <span className="text-[13px] font-semibold">{MONTHS_SL[month]} {year}</span>
          <button type="button" onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] bg-transparent border-0 cursor-pointer font-sans text-[16px] text-[#6b7280]">
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-[#9ca3af] py-1">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              type="button"
              onClick={() => handleDay(day)}
              className={`text-center text-[13px] py-[5px] border-0 cursor-pointer font-sans transition-colors ${classFor(day)}`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="flex justify-between pt-1">
          <button type="button" onClick={onClose}
            className="text-[12px] text-[#6b7280] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans">
            Prekliči
          </button>
          {step === 'end' && (
            <button type="button" onClick={() => { setStep('start'); setEnd(''); }}
              className="text-[12px] text-[#6b7280] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans">
              ← Nazaj
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
