'use client';

import { useEffect, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type GraphNodeData = {
  nodeType: 'self' | 'connection';
  displayName: string;
  role: string;
  affiliation?: string;
  isConnected: boolean;
  [key: string]: unknown;
};

export type GraphEdgeData = {
  edgeType: 'connection' | 'match' | 'interaction';
  weight?: number;
  reasons?: string[];
  count?: number;
  [key: string]: unknown;
};

type ApiNode = {
  id: string;
  type: 'self' | 'connection';
  displayName: string;
  role: string;
  affiliation?: string;
  isConnected: boolean;
};

type ApiEdge = {
  id: string;
  source: string;
  target: string;
  edgeType: 'connection' | 'match' | 'interaction';
  weight?: number;
  reasons?: string[];
  count?: number;
};

function edgeStyleFor(edgeType: ApiEdge['edgeType'], weight?: number) {
  switch (edgeType) {
    case 'connection':
      return { stroke: '#0d0d0d', strokeWidth: 1.5, opacity: 0.3 };
    case 'match':
      return {
        stroke: '#0071e3',
        strokeWidth: 1.5,
        strokeDasharray: '5,3',
        opacity: Math.min(0.7, Math.max(0.3, weight ?? 0.5)),
      };
    case 'interaction':
      return { stroke: '#16a34a', strokeWidth: 1.5, strokeDasharray: '2,3', opacity: 0.5 };
  }
}

export function useGraphData(idToken: string | undefined) {
  const [nodes, setNodes] = useState<Node<GraphNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge<GraphEdgeData>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idToken) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/connections/graph/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error('Napaka pri nalaganju grafa.');
        const data = (await res.json()) as { nodes: ApiNode[]; edges: ApiEdge[] };
        if (cancelled) return;

        setNodes(
          data.nodes.map((n) => ({
            id: n.id,
            type: 'userNode',
            position: { x: 0, y: 0 },
            data: {
              nodeType: n.type,
              displayName: n.displayName,
              role: n.role,
              affiliation: n.affiliation,
              isConnected: n.isConnected,
            },
          })),
        );

        setEdges(
          data.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            style: edgeStyleFor(e.edgeType, e.weight),
            data: {
              edgeType: e.edgeType,
              weight: e.weight,
              reasons: e.reasons,
              count: e.count,
            },
          })),
        );
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Napaka pri nalaganju grafa.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [idToken]);

  return { nodes, edges, loading, error };
}
