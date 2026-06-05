import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../connections/useGraphData';
import { useT } from '../lib/i18n';

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  participant: { bg: '#f0f7ff', text: '#2563eb', border: '#bfdbfe', dot: '#2563eb' },
  industry:    { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#d97706' },
  organizer:   { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff', dot: '#9333ea' },
};

const SELF_STYLE = { bg: '#0071e3', text: '#ffffff', border: '#0071e3', dot: '#0071e3' };

const CENTER_HANDLE: React.CSSProperties = {
  opacity: 0,
  pointerEvents: 'none',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

export function UserNode({ data, selected }: NodeProps) {
  const t = useT();
  const d = data as GraphNodeData;
  const isSelf = d.nodeType === 'self';
  const isFof = d.nodeType === 'fof';
  const baseStyle = ROLE_STYLE[d.role] ?? ROLE_STYLE.participant;
  const style = isSelf ? SELF_STYLE : {
    ...baseStyle,
    bg: isFof ? '#f9fafb' : baseStyle.bg,
    text: isFof ? '#9ca3af' : baseStyle.text,
    border: isFof ? '#e5e7eb' : baseStyle.border,
    dot: isFof ? '#d1d5db' : baseStyle.dot,
  };
  const size = isSelf ? 54 : isFof ? 34 : 44;
  const initials = d.displayName
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    // Wrapper matches circle exactly — label floats below without affecting edge anchors
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      overflow: 'visible',
      opacity: d.dimmed ? 0.15 : 1,
      transition: 'opacity 0.2s ease',
    }}>
      <Handle type="target" position={Position.Left} style={CENTER_HANDLE} />
      <Handle type="source" position={Position.Right} style={CENTER_HANDLE} />

      {/* Circle */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: style.bg,
          color: style.text,
          border: `${isFof ? '1.5px dashed' : '2px solid'} ${style.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isSelf ? 13 : isFof ? 9 : 11,
          fontWeight: 700,
          position: 'relative',
          opacity: isFof ? 0.7 : 1,
          boxShadow: isSelf
            ? '0 0 0 3px #fff, 0 0 0 5px #0071e3'
            : selected
            ? '0 0 0 2px #0071e3'
            : undefined,
          cursor: 'pointer',
          userSelect: 'none',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {initials}
        {!isSelf && (
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: style.dot,
              border: '1.5px solid #fff',
            }}
          />
        )}
      </div>

      {/* Label floats below, centred on the circle, outside node bounds */}
      <span
        style={{
          position: 'absolute',
          top: size + 5,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          fontWeight: 600,
          color: '#0d0d0d',
          background: '#fff',
          borderRadius: 4,
          padding: '1px 6px',
          whiteSpace: 'nowrap',
          maxWidth: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          pointerEvents: 'none',
        }}
      >
        {isSelf ? t('connections.graph.self') : d.displayName.split(' ')[0]}
      </span>
    </div>
  );
}
