import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Edge, Node, ReactFlowProvider, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { mockApi } from './api/mockApi';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { NodeFormPanel } from './components/forms/NodeFormPanel';
import { ApprovalNode } from './components/nodes/ApprovalNode';
import { AutomatedNode } from './components/nodes/AutomatedNode';
import { EndNode } from './components/nodes/EndNode';
import { StartNode } from './components/nodes/StartNode';
import { TaskNode } from './components/nodes/TaskNode';
import { NodePalette } from './components/palette/NodePalette';
import { SandboxPanel } from './components/sandbox/SandboxPanel';
import { PerformanceInsights } from './components/insights/PerformanceInsights';
import { AutomationAction, SimulationResult, WorkflowNodeData, WorkflowNodeType } from './types/workflow';
import { validateWorkflowStructure } from './utils/graphValidation';

type GraphState = {
  nodes: Node[];
  edges: Edge[];
};

const defaultNodeDataByType: Record<WorkflowNodeType, WorkflowNodeData> = {
  start: { title: 'Start', metadata: [] },
  task: { title: 'Task', description: '', assignee: '', dueDate: '', customFields: [] },
  approval: { title: 'Approval', approverRole: 'Manager', autoApproveThreshold: 0 },
  automated: { title: 'Automated Step', actionId: '', actionParams: {} },
  end: { title: 'End', endMessage: 'Workflow Completed', summaryFlag: false }
};

const initialNodes: Node[] = [
  {
    id: 'node-start',
    type: 'start',
    position: { x: 300, y: 80 },
    data: defaultNodeDataByType.start
  },
  {
    id: 'node-end',
    type: 'end',
    position: { x: 300, y: 350 },
    data: defaultNodeDataByType.end
  }
];

const initialEdges: Edge[] = [
  {
    id: 'edge-start-end',
    source: 'node-start',
    target: 'node-end',
    animated: true
  }
];

const nextId = (() => {
  let count = 1;
  return () => {
    count += 1;
    return `node-${count}`;
  };
})();

function AppContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [past, setPast] = useState<GraphState[]>([]);
  const [future, setFuture] = useState<GraphState[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'inspector' | 'analytics'>('inspector');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [canvasMode, setCanvasMode] = useState<'build' | 'review'>('build');
  const isRestoring = useRef(false);
  const lastSnapshot = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mockApi.getAutomations().then(setActions);
  }, []);

  useEffect(() => {
    const snapshot = JSON.stringify({ nodes, edges });

    if (!lastSnapshot.current) {
      lastSnapshot.current = snapshot;
      return;
    }

    if (snapshot === lastSnapshot.current) {
      return;
    }

    if (isRestoring.current) {
      lastSnapshot.current = snapshot;
      isRestoring.current = false;
      return;
    }

    const previous = JSON.parse(lastSnapshot.current) as GraphState;
    setPast((prev) => [...prev.slice(-39), previous]);
    setFuture([]);
    lastSnapshot.current = snapshot;
  }, [nodes, edges]);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);
  const validation = useMemo(() => validateWorkflowStructure(nodes as any, edges), [nodes, edges]);
  const automationCoverage = useMemo(() => {
    if (!nodes.length) return 0;
    return Math.round((nodes.filter((node) => node.type === 'automated').length / nodes.length) * 100);
  }, [nodes]);
  const heroInsight = useMemo(() => {
    if (!validation.isValid) {
      return validation.issues[0] ?? 'Resolve validation issues to enable safe execution.';
    }

    if (automationCoverage >= 35) {
      return 'Automation density is strong. This workflow is ready for a faster, lower-touch experience.';
    }

    if (nodes.length >= 5) {
      return 'The flow is taking shape. Add one or two automated steps to create a standout handoff experience.';
    }

    return 'Start by dragging a task or approval step into the canvas to shape the journey.';
  }, [automationCoverage, nodes.length, validation.isValid, validation.issues]);

  const nodeTypes = useMemo(
    () => ({
      start: StartNode,
      task: TaskNode,
      approval: ApprovalNode,
      automated: AutomatedNode,
      end: EndNode
    }),
    []
  );

  const createNode = (type: WorkflowNodeType, position: { x: number; y: number }): Node => ({
    id: nextId(),
    type,
    position,
    data: { ...defaultNodeDataByType[type] }
  });

  const onUpdateNode = (nodeId: string, updater: (node: Node) => Node) => {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? updater(node) : node)));
  };

  const onDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) => prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
  };

  const applyGraph = (graph: GraphState) => {
    isRestoring.current = true;
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedNodeId(null);
    setSimulation(null);
  };

  const onUndo = () => {
    if (!past.length) return;

    const previous = past[past.length - 1];
    const current: GraphState = { nodes, edges };
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [...prev, current]);
    applyGraph(previous);
  };

  const onRedo = () => {
    if (!future.length) return;

    const next = future[future.length - 1];
    const current: GraphState = { nodes, edges };
    setFuture((prev) => prev.slice(0, -1));
    setPast((prev) => [...prev, current]);
    applyGraph(next);
  };

  const onExport = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as GraphState;
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error('Invalid workflow JSON format');
        }

        const normalizedNodes = parsed.nodes.map((node, index) => ({
          ...node,
          id: node.id || `import-node-${index + 1}`,
          position: node.position || { x: 240 + index * 20, y: 120 + index * 20 }
        }));

        const normalizedEdges = parsed.edges.map((edge, index) => ({
          ...edge,
          id: edge.id || `import-edge-${index + 1}`
        }));

        setPast((prev) => [...prev.slice(-39), { nodes, edges }]);
        setFuture([]);
        applyGraph({ nodes: normalizedNodes, edges: normalizedEdges });
      } catch {
        window.alert('Invalid JSON file. Please import a valid workflow export.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const resetCanvas = () => {
    setPast((prev) => [...prev.slice(-39), { nodes, edges }]);
    setFuture([]);
    applyGraph({ nodes: initialNodes, edges: initialEdges });
  };

  const runSimulation = async () => {
    setRunning(true);
    const result = await mockApi.simulate({ nodes: nodes as any, edges });
    setSimulation(result);
    setRunning(false);
  };

  return (
    <div className="app-root">
      <header className="top-bar">
        <div className="hero-copy">
          <div className="eyebrow">Tredence Workflow Studio</div>
          <h1>HR Workflow Designer Module</h1>
          <p>
            Configure onboarding, approvals, and automated handoffs with a clearer view of workflow health,
            dependencies, and execution readiness.
          </p>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-top">
            <div>
              <div className="hero-panel-label">Live guidance</div>
              <div className="hero-panel-title">{validation.isValid ? 'Ready for simulation' : 'Needs attention'}</div>
            </div>
            <div className={`status-pill ${validation.isValid ? 'ok' : 'warn'}`}>
              {validation.isValid ? 'Workflow Valid' : `Issues: ${validation.issues.length}`}
            </div>
          </div>
          <p className="hero-panel-copy">{heroInsight}</p>
          <div className="top-actions">
            <button className="secondary-btn action-btn" onClick={onUndo} disabled={!past.length}>
              Undo
            </button>
            <button className="secondary-btn action-btn" onClick={onRedo} disabled={!future.length}>
              Redo
            </button>
            <button className="secondary-btn action-btn" onClick={onExport}>
              Export JSON
            </button>
            <button className="secondary-btn action-btn" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden-input" onChange={onImport} />
        </div>
      </header>

      <main className="main-layout three-col">
        <NodePalette
          onReset={resetCanvas}
          searchTerm={paletteSearch}
          onSearchChange={setPaletteSearch}
        />

        <section className="canvas-stage">
          <div className="canvas-toolbar panel">
            <div className="toolbar-group">
              <div className="toolbar-label">Workspace mode</div>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segment-btn ${canvasMode === 'build' ? 'active' : ''}`}
                  onClick={() => setCanvasMode('build')}
                >
                  Build
                </button>
                <button
                  type="button"
                  className={`segment-btn ${canvasMode === 'review' ? 'active' : ''}`}
                  onClick={() => setCanvasMode('review')}
                >
                  Review
                </button>
              </div>
            </div>
            <div className="toolbar-group toolbar-metrics">
              <div className="toolbar-stat">
                <span>Nodes</span>
                <strong>{nodes.length}</strong>
              </div>
              <div className="toolbar-stat">
                <span>Connections</span>
                <strong>{edges.length}</strong>
              </div>
              <div className="toolbar-stat">
                <span>Selection</span>
                <strong>{String(selectedNode?.data.title ?? 'None')}</strong>
              </div>
            </div>
          </div>

          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectNode={setSelectedNodeId}
            setNodes={setNodes}
            setEdges={setEdges}
            createNode={createNode}
          />
        </section>

        <div className="sidebar-right">
          <div className="sidebar-tabs panel">
            <button
              type="button"
              className={`sidebar-tab ${activeSidebarTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('inspector')}
            >
              Inspector
            </button>
            <button
              type="button"
              className={`sidebar-tab ${activeSidebarTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('analytics')}
            >
              Analytics
            </button>
          </div>
          {activeSidebarTab === 'inspector' ? (
            <NodeFormPanel
              selectedNode={selectedNode as any}
              actions={actions}
              onUpdateNode={onUpdateNode as any}
              onDeleteNode={onDeleteNode}
              nodeCount={nodes.length}
              edgeCount={edges.length}
            />
          ) : (
            <PerformanceInsights nodes={nodes as any} edges={edges} />
          )}
        </div>
      </main>

      {!validation.isValid && (
        <section className="validation-strip">
          {validation.issues.slice(0, 2).map((issue) => (
            <div key={issue} className="validation-item">
              {issue}
            </div>
          ))}
        </section>
      )}

      <SandboxPanel nodes={nodes as any} edges={edges} onRun={runSimulation} simulation={simulation} isRunning={running} />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
