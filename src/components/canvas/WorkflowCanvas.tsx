import {
  addEdge,
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  OnConnect,
  ReactFlow,
  ReactFlowInstance
} from '@xyflow/react';
import { useCallback, useRef } from 'react';
import { WorkflowNodeType } from '../../types/workflow';

type Props = {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: Record<string, React.ComponentType<any>>;
  onNodesChange: any;
  onEdgesChange: any;
  onSelectNode: (id: string | null) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  createNode: (type: WorkflowNodeType, position: { x: number; y: number }) => Node;
};

const onboardingHints = [
  'Start by dragging a Task node into the canvas.',
  'Connect this flow with an approval step for manager review.',
  'Use the inspector to add owners, dates, and automation details.'
];

export const WorkflowCanvas = ({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
  setNodes,
  setEdges,
  createNode
}: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const isNearEmpty = nodes.length <= 2;
  const needsConnections = nodes.length > 2 && edges.length < nodes.length - 1;
  const needsApproval = !nodes.some((node) => node.type === 'approval');

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#4e8b74'
            }
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
      if (!type || !reactFlowInstance.current || !wrapperRef.current) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      });

      setNodes((prev) => [...prev, createNode(type, position)]);
    },
    [createNode, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="canvas" ref={wrapperRef}>
      <div className="canvas-overlay">
        <div>
          <span className="canvas-overline">Visual flowboard</span>
          <strong>Map the journey</strong>
        </div>
        <p>Drag nodes, connect logic, and click any block to tune the experience in real time.</p>
      </div>
      {(isNearEmpty || needsConnections || needsApproval) && (
        <div className="onboarding-hints">
          {onboardingHints
            .filter((hint, index) => {
              if (index === 0) return isNearEmpty;
              if (index === 1) return needsConnections || needsApproval;
              return true;
            })
            .map((hint) => (
              <div key={hint} className="hint-card">
                <span className="hint-dot" />
                <span>{hint}</span>
              </div>
            ))}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{
          animated: true,
          className: 'workflow-edge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#4e8b74'
          },
          style: { stroke: '#4e8b74', strokeWidth: 2.4 }
        }}
      >
        <Background gap={20} size={1.2} color="rgba(139, 156, 202, 0.2)" />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
};
