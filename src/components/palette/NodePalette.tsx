import { WorkflowNodeType } from '../../types/workflow';

const paletteItems: { type: WorkflowNodeType; label: string; accent: string; detail: string }[] = [
  { type: 'start', label: 'Start Node', accent: 'Launch', detail: 'Kick off every workflow with a clear trigger.' },
  { type: 'task', label: 'Task Node', accent: 'Human Step', detail: 'Assign work with owners, due dates, and fields.' },
  { type: 'approval', label: 'Approval Node', accent: 'Decision', detail: 'Add controlled checkpoints for managers or leads.' },
  { type: 'automated', label: 'Automated Step', accent: 'Automation', detail: 'Connect system actions for speed and consistency.' },
  { type: 'end', label: 'End Node', accent: 'Closure', detail: 'Wrap the journey with summaries and completion states.' }
];

type Props = {
  onReset: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  layout?: 'vertical' | 'horizontal';
};

export const NodePalette = ({
  onReset,
  searchTerm,
  onSearchChange,
  layout = 'vertical'
}: Props) => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, type: WorkflowNodeType) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredItems = paletteItems.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.accent.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <aside className={`panel palette palette-${layout}`}>
      <div className="section-heading">
        <span className="section-kicker">Builder</span>
        <h3>Workflow blocks</h3>
        <p>Drag components into the canvas to compose a polished employee journey.</p>
      </div>
      <div className="palette-search-shell">
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search blocks"
          className="palette-search"
        />
      </div>
      <div className="palette-list">
        {filteredItems.map((item) => (
          <div
            key={item.type}
            className={`palette-item palette-${item.type}`}
            draggable
            onDragStart={(event) => onDragStart(event, item.type)}
          >
            <div className="palette-accent">{item.accent}</div>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>
      {!filteredItems.length ? <div className="empty-palette">No matching blocks found.</div> : null}
      <button className="secondary-btn" onClick={onReset}>
        Clear Canvas
      </button>
    </aside>
  );
};
