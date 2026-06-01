'use client';

import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import { UserNode } from './UserNode';
import { UserPopup } from './UserPopup';
import { useGraphData, type GraphNodeData, type GraphEdgeData } from '../connections/useGraphData';

const nodeTypes = { userNode: UserNode };

type SimNode = SimulationNodeDatum & { id: string };
type SimLink = SimulationLinkDatum<SimNode>;

function applyForceLayout(
  nodes: Node<GraphNodeData>[],
  edges: { source: string; target: string }[],
  width: number,
  height: number,
): Node<GraphNodeData>[] {
  if (nodes.length === 0) return nodes;

  const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id, x: width / 2, y: height / 2 }));
  const idIndex = new Map(simNodes.map((n, i) => [n.id, i]));

  const simLinks: SimLink[] = edges
    .map((e) => ({
      source: simNodes[idIndex.get(e.source) ?? 0],
      target: simNodes[idIndex.get(e.target) ?? 0],
    }))
    .filter((l) => l.source && l.target);

  const selfSim = simNodes.find((n) =>
    nodes.find((rn) => rn.id === n.id)?.data?.nodeType === 'self',
  );
  if (selfSim) {
    selfSim.fx = width / 2;
    selfSim.fy = height / 2;
  }

  forceSimulation(simNodes)
    .force('link', forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(140))
    .force('charge', forceManyBody().strength(-140))
    .force('center', forceCenter(width / 2, height / 2))
    .tick(300)
    .stop();

  const posMap = new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
  return nodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? { x: 0, y: 0 } }));
}

type Props = {
  idToken: string | undefined;
  connectedUids: Set<string>;
  pendingUids: Set<string>;
  onConnectAction: (uid: string) => Promise<void>;
};

export function ConnectionGraph({ idToken, connectedUids, pendingUids, onConnectAction }: Props) {
  const { nodes: rawNodes, edges: rawEdges, loading, error } = useGraphData(idToken);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<GraphEdgeData>>([]);
  const [selectedNode, setSelectedNode] = useState<(GraphNodeData & { id: string }) | null>(null);
  const [connectingUids, setConnectingUids] = useState<Record<string, boolean>>({});

  // Apply d3-force layout once when data arrives
  useEffect(() => {
    if (rawNodes.length === 0) return;
    const laid = applyForceLayout(rawNodes, rawEdges, 600, 400);
    setNodes(laid);
    setEdges(rawEdges);
  }, [rawNodes, rawEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    const d = node.data as GraphNodeData;
    if (d.nodeType === 'self') return;
    setSelectedNode({ ...d, id: node.id });
  }, []);

  async function handleConnect(uid: string) {
    setConnectingUids((prev) => ({ ...prev, [uid]: true }));
    try {
      await onConnectAction(uid);
      setSelectedNode(null);
    } finally {
      setConnectingUids((prev) => ({ ...prev, [uid]: false }));
    }
  }

  if (loading) {
    return (
      <div className="rounded-[12px] bg-[#f7f7f7] px-4 py-3 text-sm text-[#8e8e93]">
        Nalaganje grafa...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">{error}</div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
        Nimate še nobenih potrjenih povezav za prikaz v grafu.
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 240px)', minHeight: 420, borderRadius: 14, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedNode(null)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background color="#f0f0f0" gap={20} />
        <Controls />
        <MiniMap nodeColor={(n) => {
          const d = n.data as GraphNodeData;
          if (d.nodeType === 'self') return '#0071e3';
          if (d.role === 'industry') return '#d97706';
          if (d.role === 'organizer') return '#9333ea';
          return '#2563eb';
        }} />

        {selectedNode && (
          <Panel position="top-right">
            <UserPopup
              node={selectedNode}
              isConnected={connectedUids.has(selectedNode.id)}
              isPending={pendingUids.has(selectedNode.id)}
              isConnecting={Boolean(connectingUids[selectedNode.id])}
              onConnect={() => void handleConnect(selectedNode.id)}
              onClose={() => setSelectedNode(null)}
            />
          </Panel>
        )}

        <Panel position="bottom-right">
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 11,
              color: '#555',
              fontFamily: 'system-ui, sans-serif',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <LegendRow color="#0d0d0d" dash={undefined} label="Povezava" />
            <LegendRow color="#0071e3" dash="5,3" label="Ujemanje (AI)" />
            <LegendRow color="#16a34a" dash="2,3" label="Skupno srečanje" />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function LegendRow({ color, dash, label }: { color: string; dash?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <svg width="22" height="10" style={{ flexShrink: 0 }}>
        <line
          x1="0" y1="5" x2="22" y2="5"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray={dash}
          opacity="0.7"
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}
