'use client';

import { useState } from 'react';
import { useT } from '../lib/i18n';

type Step = 'start-hour' | 'start-minute' | 'end-hour' | 'end-minute';

type Props = {
  startTime: string;
  endTime: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
};

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 86;
const INNER_R = 54;

// 24h outer ring = 12,1..11; inner ring = 0,13..23
const OUTER_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const INNER_HOURS = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number) { return String(n).padStart(2, '0'); }

function pos(index: number, r: number) {
  const a = ((index * 30) - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function parseTime(t: string): { h: number; m: number } | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return { h, m };
}

export default function ClockTimePicker({ startTime, endTime, onChange, onClose }: Props) {
  const t = useT();
  const [step, setStep] = useState<Step>('start-hour');
  const [startH, setStartH] = useState<number | null>(() => parseTime(startTime)?.h ?? null);
  const [startM, setStartM] = useState<number | null>(() => parseTime(startTime)?.m ?? null);
  const [endH, setEndH] = useState<number | null>(() => parseTime(endTime)?.h ?? null);
  const [endM, setEndM] = useState<number | null>(() => parseTime(endTime)?.m ?? null);

  const isStartStep = step === 'start-hour' || step === 'start-minute';
  const isHourStep = step === 'start-hour' || step === 'end-hour';

  const curVal = step === 'start-hour' ? startH
    : step === 'start-minute' ? startM
    : step === 'end-hour' ? endH
    : endM;

  const canAdvance = curVal !== null;

  // Determine if a given hour/minute is disabled on the end steps
  function isHourDisabled(h: number): boolean {
    if (startH === null) return false;
    if (h < startH) return true;
    // Same hour is only valid if some minute > startM exists
    if (h === startH) {
      return !MINUTES.some(m => m > (startM ?? -1));
    }
    return false;
  }

  function isMinuteDisabled(m: number): boolean {
    if (step !== 'end-minute') return false;
    if (endH === startH) return m <= (startM ?? -1);
    return false;
  }

  function pickValue(value: number) {
    switch (step) {
      case 'start-hour': setStartH(value); break;
      case 'start-minute': setStartM(value); break;
      case 'end-hour': setEndH(value); break;
      case 'end-minute': setEndM(value); break;
    }
  }

  function handleNext() {
    if (step === 'start-hour') setStep('start-minute');
    else if (step === 'start-minute') setStep('end-hour');
    else if (step === 'end-hour') setStep('end-minute');
    else {
      onChange(
        `${pad(startH!)}:${pad(startM!)}`,
        `${pad(endH!)}:${pad(endM!)}`,
      );
      onClose();
    }
  }

  function goBack() {
    if (step === 'start-minute') setStep('start-hour');
    else if (step === 'end-hour') setStep('start-minute');
    else if (step === 'end-minute') setStep('end-hour');
  }

  // Hand target: position of currently selected value
  function getHandTarget() {
    if (isHourStep && curVal !== null) {
      const oi = OUTER_HOURS.indexOf(curVal);
      if (oi >= 0) return pos(oi, OUTER_R);
      const ii = INNER_HOURS.indexOf(curVal);
      if (ii >= 0) return pos(ii, INNER_R);
    }
    if (!isHourStep && curVal !== null) {
      const mi = MINUTES.indexOf(curVal);
      if (mi >= 0) return pos(mi, OUTER_R);
    }
    return null;
  }

  const handTarget = getHandTarget();

  const startDisplay = startH !== null
    ? `${pad(startH)}:${startM !== null ? pad(startM) : '──'}`
    : '──:──';
  const endDisplay = endH !== null
    ? `${pad(endH)}:${endM !== null ? pad(endM) : '──'}`
    : '──:──';

  const stepLabel =
    step === 'start-hour'
      ? t('timePicker.step.startHour', 'Start — hour')
      : step === 'start-minute'
        ? t('timePicker.step.startMinute', 'Start — minute')
        : step === 'end-hour'
          ? t('timePicker.step.endHour', 'End — hour')
          : t('timePicker.step.endMinute', 'End — minute');

  const nextLabel =
    step === 'end-minute'
      ? `${t('timePicker.confirm', 'Confirm')} ✓`
      : `${t('timePicker.next', 'Next')} →`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[20px] p-5 shadow-xl flex flex-col items-center gap-3 w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wide self-start">
          {stepLabel}
        </p>

        {/* Time display */}
        <div className="flex items-center gap-3 text-[24px] font-bold tracking-tight">
          <span className={isStartStep ? 'text-[#0d0d0d]' : 'text-[#d1d5db]'}>{startDisplay}</span>
          <span className="text-[#d1d5db] text-[18px]">→</span>
          <span className={!isStartStep ? 'text-[#0d0d0d]' : 'text-[#d1d5db]'}>{endDisplay}</span>
        </div>

        {/* Clock face */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={CX} cy={CY} r={110} fill="#f3f4f6" />

          {handTarget && (
            <>
              <line x1={CX} y1={CY} x2={handTarget.x} y2={handTarget.y}
                stroke="#0d0d0d" strokeWidth={2} strokeLinecap="round" />
              <circle cx={CX} cy={CY} r={4} fill="#0d0d0d" />
            </>
          )}

          {isHourStep ? (
            <>
              {OUTER_HOURS.map((h, i) => {
                const { x, y } = pos(i, OUTER_R);
                const sel = (step === 'end-hour' ? endH : startH) === h;
                const disabled = step === 'end-hour' && isHourDisabled(h);
                return (
                  <g key={h}
                    onClick={() => !disabled && pickValue(h)}
                    style={{ cursor: disabled ? 'default' : 'pointer' }}>
                    <circle cx={x} cy={y} r={17}
                      fill={sel ? '#0d0d0d' : 'transparent'} />
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                      fontSize={13} fontWeight={sel ? 700 : 400}
                      fill={disabled ? '#d1d5db' : sel ? '#fff' : '#374151'}
                      fontFamily="sans-serif">
                      {pad(h)}
                    </text>
                  </g>
                );
              })}
              {INNER_HOURS.map((h, i) => {
                const { x, y } = pos(i, INNER_R);
                const sel = (step === 'end-hour' ? endH : startH) === h;
                const disabled = step === 'end-hour' && isHourDisabled(h);
                return (
                  <g key={`i${h}`}
                    onClick={() => !disabled && pickValue(h)}
                    style={{ cursor: disabled ? 'default' : 'pointer' }}>
                    <circle cx={x} cy={y} r={14}
                      fill={sel ? '#0d0d0d' : 'transparent'} />
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                      fontSize={11} fontWeight={sel ? 700 : 400}
                      fill={disabled ? '#d1d5db' : sel ? '#fff' : '#6b7280'}
                      fontFamily="sans-serif">
                      {pad(h)}
                    </text>
                  </g>
                );
              })}
            </>
          ) : (
            MINUTES.map((m, i) => {
              const { x, y } = pos(i, OUTER_R);
              const sel = (step === 'end-minute' ? endM : startM) === m;
              const disabled = isMinuteDisabled(m);
              return (
                <g key={m}
                  onClick={() => !disabled && pickValue(m)}
                  style={{ cursor: disabled ? 'default' : 'pointer' }}>
                  <circle cx={x} cy={y} r={17}
                    fill={sel ? '#0d0d0d' : 'transparent'} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                    fontSize={13} fontWeight={sel ? 700 : 400}
                    fill={disabled ? '#d1d5db' : sel ? '#fff' : '#374151'}
                    fontFamily="sans-serif">
                    {pad(m)}
                  </text>
                </g>
              );
            })
          )}
        </svg>

        {/* Actions */}
        <div className="flex justify-between w-full">
          <button type="button" onClick={onClose}
            className="text-[12px] text-[#6b7280] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans">
            {t('common.cancel', 'Cancel')}
          </button>
          <div className="flex gap-3">
            {step !== 'start-hour' && (
              <button type="button" onClick={goBack}
                className="text-[12px] text-[#6b7280] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans">
                ← {t('common.back', 'Back')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance}
              className="text-[12px] font-semibold text-white bg-[#0d0d0d] hover:bg-[#1f1f1f] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-[5px] rounded-[7px] border-0 cursor-pointer font-sans transition-colors"
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
