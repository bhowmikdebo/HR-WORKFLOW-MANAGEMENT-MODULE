import { Edge } from '@xyflow/react';
import { SimulationResult, WorkflowNode } from '../../types/workflow';

type Props = {
  nodes: WorkflowNode[];
  edges: Edge[];
  onRun: () => void;
  simulation: SimulationResult | null;
  isRunning: boolean;
};

export const SandboxPanel = ({ nodes, edges, onRun, simulation, isRunning }: Props) => {
  const graph = JSON.stringify({ nodes, edges }, null, 2);

  return (
    <section className="panel sandbox">
      <div className="sandbox-header">
        <div className="section-heading">
          <span className="section-kicker">Sandbox</span>
          <h3>Simulation lab</h3>
          <p>Stress-test the workflow and review the execution path before rollout.</p>
        </div>
        <button className="run-btn" onClick={onRun} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      <div className="sandbox-grid">
        <div>
          <h4>Serialized Graph</h4>
          <pre>{graph}</pre>
        </div>
        <div>
          <h4>Execution Log</h4>
          {!simulation && <p>Run simulation to see step-by-step execution.</p>}
          {simulation && !simulation.isValid && (
            <ul className="issues">
              {simulation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
          {simulation?.isValid && (
            <ol className="execution-list">
              {simulation.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};
