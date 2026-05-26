'use client';

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
};

type SessionCardProps = {
  session: SessionItem;
  isRegistering: boolean;
  registerError?: string;
  onRegister: () => void;
  onCancel: () => void;
  isAdminOrOrganizer: boolean;
  onEdit: () => void;
  onDelete: () => void;
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
  isRegistering,
  registerError,
  onRegister,
  onCancel,
  isAdminOrOrganizer,
  onEdit,
  onDelete,
}: SessionCardProps) {
  const isFull =
    session.capacity !== null &&
    session.registeredCount >= session.capacity;

  const speakerNames = session.speakers.map((s) => s.name).join(', ');

  const bgClass = session.isRegistered
    ? 'bg-[#ecfdf3] border-[#a7f3d0]'
    : 'bg-white border-[#e5e7eb]';

  return (
    <div
      className={`rounded-[10px] border p-[10px] h-full flex flex-col gap-[4px] ${bgClass}`}
    >
      <p className="text-[12px] font-semibold text-[#0d0d0d] leading-[1.3]">
        {session.title}
      </p>

      {speakerNames && (
        <p className="text-[10px] text-[#6e6e73]">{speakerNames}</p>
      )}

      <p className="text-[10px] text-[#8e8e93]">
        {formatTimeRange(session.startAt, session.endAt)}
      </p>

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
