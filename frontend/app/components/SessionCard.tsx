'use client';

import { TagPills } from './TagPicker';

export type Speaker = {
  name: string;
  bio?: string;
  userId?: string;
};

export type SessionItem = {
  id: string;
  title: string;
  description: string;
  speakers: Speaker[];
  startAt: string;
  endAt: string;
  location: string;
  capacity: number | null;
  registeredCount: number;
  isRegistered: boolean;
  tags?: string[];
  presenterName?: string;
  presenterUid?: string;
  presenterStatus?: 'pending' | 'confirmed' | 'auto_confirmed' | 'declined';
  status?: 'active' | 'cancelled';
};

type SessionCardProps = {
  session: SessionItem;
  tagMap: Record<string, string>;
  isRegistering: boolean;
  registerError?: string;
  onRegister: () => void;
  onCancel: () => void;
  isAdminOrOrganizer: boolean;
  onEdit: () => void;
  onDelete: () => void;
  currentUserUid?: string;
  onPresenterConfirm?: () => void;
  onPresenterDecline?: () => void;
};

function formatTimeRange(startAt: string, endAt: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  return `${new Date(startAt).toLocaleTimeString('sl-SI', opts)} – ${new Date(endAt).toLocaleTimeString('sl-SI', opts)}`;
}

export default function SessionCard({
  session,
  tagMap,
  isRegistering,
  registerError,
  onRegister,
  onCancel,
  isAdminOrOrganizer,
  onEdit,
  onDelete,
  currentUserUid,
  onPresenterConfirm,
  onPresenterDecline,
}: SessionCardProps) {
  const isFull =
    session.capacity !== null &&
    session.registeredCount >= session.capacity;

  const speakerNames = session.speakers.map((s) => s.name).join(', ');

  const isInvitedPresenter =
    currentUserUid != null &&
    session.presenterUid === currentUserUid &&
    session.presenterStatus === 'pending';

  const isCancelled = session.status === 'cancelled';

  const bgClass = isCancelled
    ? 'bg-[#fff1f2] border-[#fecaca]'
    : session.isRegistered
      ? 'bg-[#ecfdf3] border-[#a7f3d0]'
      : 'bg-white border-[#e5e7eb]';

  return (
    <div
      className={`rounded-[10px] border p-[10px] h-full flex flex-col gap-[4px] ${bgClass}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[12px] font-semibold text-[#0d0d0d] leading-[1.3]">
          {session.title}
        </p>
        {isCancelled && (
          <span className="shrink-0 text-[9px] font-bold text-[#dc2626] bg-[#fff1f2] px-[6px] py-[2px] rounded-full">
            Odpovedano
          </span>
        )}
      </div>

      {speakerNames && (
        <p className="text-[10px] text-[#6e6e73]">{speakerNames}</p>
      )}

      <p className="text-[10px] text-[#8e8e93]">
        {formatTimeRange(session.startAt, session.endAt)}
      </p>

      {(session.tags ?? []).length > 0 && (
        <div className="mt-1">
          <TagPills
            tags={(session.tags ?? []).map((slug) => ({
              slug,
              label: tagMap[slug] ?? slug,
            }))}
          />
        </div>
      )}

      {/* Presenter status row */}
      {session.presenterStatus && (
        <div className="flex items-center gap-1 flex-wrap">
          {session.presenterStatus === 'pending' && (
            <span className="text-[9px] font-semibold bg-[#fef3c7] text-[#92400e] px-[5px] py-[1px] rounded-[4px]">
              ⏳ Presenter pending
            </span>
          )}
          {session.presenterStatus === 'confirmed' && (
            <span className="text-[9px] font-semibold bg-[#ecfdf3] text-[#166534] px-[5px] py-[1px] rounded-[4px]">
              ✓ Presenter confirmed
            </span>
          )}
          {session.presenterStatus === 'declined' && (
            <span className="text-[9px] font-semibold bg-[#fff1f2] text-[#dc2626] px-[5px] py-[1px] rounded-[4px]">
              ✕ Presenter declined
            </span>
          )}
          {session.presenterStatus === 'auto_confirmed' && (
            <span className="text-[9px] font-semibold bg-[#f3f4f6] text-[#6b7280] px-[5px] py-[1px] rounded-[4px]">
              Presenter invited
            </span>
          )}
        </div>
      )}

      {/* Presenter invite response buttons */}
      {isInvitedPresenter && (
        <div className="flex gap-1 items-center mt-[2px]">
          <span className="text-[9px] text-[#92400e]">You&apos;re invited as presenter:</span>
          <button
            type="button"
            onClick={onPresenterConfirm}
            className="text-[9px] font-semibold px-[6px] py-[2px] rounded-[5px] bg-[#ecfdf3] text-[#166534] hover:bg-[#d1fae5] border-0 cursor-pointer font-sans"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onPresenterDecline}
            className="text-[9px] font-semibold px-[6px] py-[2px] rounded-[5px] bg-[#fff1f2] text-[#dc2626] hover:bg-[#fee2e2] border-0 cursor-pointer font-sans"
          >
            Decline
          </button>
        </div>
      )}

      <div className="mt-auto pt-[6px] flex items-center justify-between gap-2 flex-wrap">
        {/* Capacity pill */}
        {session.isRegistered ? (
          <span className="text-[9px] font-semibold bg-[#ecfdf3] text-[#166534] px-[5px] py-[1px] rounded-[4px]">
            ✓ Prijavljen/a
          </span>
        ) : session.capacity === null ? (
          <span className="text-[9px] text-[#8e8e93]">Brez omejitve</span>
        ) : isFull ? (
          <span className="text-[9px] font-semibold bg-[#fff1f2] text-[#dc2626] px-[5px] py-[1px] rounded-[4px]">
            Razprodano
          </span>
        ) : (
          <span className="text-[9px] text-[#6e6e73]">
            {session.registeredCount}/{session.capacity}
          </span>
        )}

        <div className="flex gap-1">
          {session.isRegistered ? (
            <button
              type="button"
              disabled={isRegistering}
              onClick={onCancel}
              className="text-[9px] font-semibold px-[6px] py-[2px] rounded-[5px] bg-[#ecfdf3] text-[#166534] hover:bg-[#d1fae5] border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              {isRegistering ? '...' : 'Odjavi'}
            </button>
          ) : (
            <button
              type="button"
              disabled={isFull || isRegistering}
              onClick={onRegister}
              className="text-[9px] font-semibold px-[6px] py-[2px] rounded-[5px] bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            >
              {isRegistering ? '...' : isFull ? 'Polno' : 'Prijavi'}
            </button>
          )}

          {isAdminOrOrganizer && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="text-[9px] font-semibold px-[6px] py-[2px] rounded-[5px] bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] border-0 cursor-pointer font-sans"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-[9px] font-semibold px-[6px] py-[2px] rounded-[5px] bg-[#fff1f2] text-[#dc2626] hover:bg-[#fee2e2] border-0 cursor-pointer font-sans"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {registerError && (
        <p className="text-[9px] text-[#dc2626] mt-[2px]">{registerError}</p>
      )}
    </div>
  );
}
