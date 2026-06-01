import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../connections/useGraphData';

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  participant: { bg: '#f0f7ff', text: '#2563eb', border: '#bfdbfe', dot: '#2563eb' },
  industry:    { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#d97706' },
  organizer:   { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff', dot: '#9333ea' },
};

const SELF_STYLE = { bg: '#0071e3', text: '#ffffff', border: '#0071e3', dot: '#0071e3' };

export function UserNode({ data, selected }: NodeProps) {
  const d = data as GraphNodeData;
  const isSelf = d.nodeType === 'self';
  const style = isSelf ? SELF_STYLE : (ROLE_STYLE[d.role] ?? ROLE_STYLE.participant);
  const size = isSelf ? 54 : 44;
  const initials = d.displayName
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />

      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: style.bg,
          color: style.text,
          border: `2px solid ${style.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isSelf ? 13 : 11,
          fontWeight: 700,
          position: 'relative',
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

      <span
        style={{
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
        }}
      >
        {isSelf ? 'Jaz' : d.displayName.split(' ')[0]}
      </span>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}
