import type { GraphNodeData } from '../connections/useGraphData';

const ROLE_LABEL: Record<string, string> = {
  participant: 'Udeleženec',
  industry: 'Industrija',
  organizer: 'Organizator',
  admin: 'Admin',
  guest: 'Gost',
};

type Props = {
  node: GraphNodeData & { id: string };
  isConnected: boolean;
  isPending: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onClose: () => void;
};

export function UserPopup({ node, isConnected, isPending, isConnecting, onConnect, onClose }: Props) {
  if (node.nodeType === 'self') return null;
  const isFof = node.nodeType === 'fof';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: '14px 16px',
        minWidth: 200,
        maxWidth: 240,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          color: '#8e8e93',
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Zapri"
      >
        ×
      </button>

      <p style={{ fontSize: 14, fontWeight: 700, color: '#0d0d0d', margin: '0 0 2px', paddingRight: 20 }}>
        {node.displayName}
      </p>
      <p style={{ fontSize: 12, color: '#8e8e93', margin: '0 0 6px' }}>
        {ROLE_LABEL[node.role] ?? node.role}
        {isFof && <span style={{ marginLeft: 6, fontSize: 10, color: '#d1d5db', fontStyle: 'italic' }}>prijatelj prijatelja</span>}
      </p>
      {node.affiliation && (
        <p style={{ fontSize: 12, color: '#555', margin: '0 0 10px' }}>{String(node.affiliation)}</p>
      )}

      {isConnected ? (
        <span
          style={{
            display: 'inline-block',
            fontSize: 12,
            color: '#166534',
            background: '#ecfdf3',
            border: '1px solid #d1fae5',
            borderRadius: 8,
            padding: '4px 10px',
            fontWeight: 600,
          }}
        >
          Povezana
        </span>
      ) : isPending ? (
        <span
          style={{
            display: 'inline-block',
            fontSize: 12,
            color: '#92400e',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '4px 10px',
            fontWeight: 600,
          }}
        >
          Zahteva poslana
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          disabled={isConnecting}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            background: '#0071e3',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
            opacity: isConnecting ? 0.5 : 1,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {isConnecting ? '...' : 'Poveži se'}
        </button>
      )}
    </div>
  );
}
