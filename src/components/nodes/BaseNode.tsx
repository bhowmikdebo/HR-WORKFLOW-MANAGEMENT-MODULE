import { Handle, Node, NodeProps, Position } from '@xyflow/react';
import { WorkflowNodeData, WorkflowNodeType } from '../../types/workflow';

type CanvasNode = Node<WorkflowNodeData, WorkflowNodeType>;

type BaseNodeProps = NodeProps<CanvasNode> & {
  colorClass: string;
  nodeType: WorkflowNodeType;
  subtitle?: string;
  hasTarget?: boolean;
  hasSource?: boolean;
};

const getTaskDescriptionPreview = (description?: string) => {
  const trimmed = description?.trim();
  if (!trimmed) return null;

  const maxPreviewLength = 200;
  const wrapEvery = 50;
  const limitedText = trimmed.slice(0, maxPreviewLength);
  const lines: string[] = [];

  for (let index = 0; index < limitedText.length; index += wrapEvery) {
    lines.push(limitedText.slice(index, index + wrapEvery));
  }

  const preview = lines.join('\n');

  return {
    previewText: trimmed.length > maxPreviewLength ? `${preview}...` : preview,
    truncated: trimmed.length > maxPreviewLength
  };
};

const getNodeIcon = (type: WorkflowNodeType) => {
  if (type === 'start') return 'ST';
  if (type === 'task') return 'TK';
  if (type === 'approval') return 'AP';
  if (type === 'automated') return 'AU';
  return 'EN';
};

const getNodeStatus = (type: WorkflowNodeType, data: WorkflowNodeData) => {
  if (type === 'task') {
    if (!data.description?.trim()) return 'Needs brief';
    if (!data.assignee?.trim()) return 'Needs owner';
    return 'Ready';
  }

  if (type === 'approval') {
    return data.approverRole?.trim() ? 'Routed' : 'Needs approver';
  }

  if (type === 'automated') {
    return data.actionId?.trim() ? 'Configured' : 'Needs action';
  }

  if (type === 'end') {
    return data.summaryFlag ? 'Summary on' : 'Complete';
  }

  return 'Entry';
};

const getNodeMetaTags = (type: WorkflowNodeType, data: WorkflowNodeData) => {
  if (type === 'task') {
    return [data.dueDate ? `Due ${data.dueDate}` : null, data.customFields?.length ? `${data.customFields.length} fields` : null].filter(
      Boolean
    ) as string[];
  }

  if (type === 'approval') {
    return [data.approverRole ? data.approverRole : null, data.autoApproveThreshold ? `Auto ${data.autoApproveThreshold}` : null].filter(
      Boolean
    ) as string[];
  }

  if (type === 'automated') {
    return [data.actionId ? data.actionId.replace(/_/g, ' ') : null].filter(Boolean) as string[];
  }

  if (type === 'end') {
    return [data.summaryFlag ? 'Summary enabled' : null].filter(Boolean) as string[];
  }

  return [data.metadata?.length ? `${data.metadata.length} metadata` : null].filter(Boolean) as string[];
};

const getInitials = (value?: string) =>
  value
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || null;

export const BaseNode = ({
  data,
  selected,
  colorClass,
  nodeType,
  subtitle,
  hasTarget = true,
  hasSource = true
}: BaseNodeProps) => {
  const customFields = data.customFields?.filter((item) => item.key && item.value).length ?? 0;
  const metadata = data.metadata?.filter((item) => item.key && item.value).length ?? 0;
  const totalMeta = customFields + metadata;
  const taskPreview = colorClass === 'node-task' ? getTaskDescriptionPreview(data.description) : null;
  const metaTags = getNodeMetaTags(nodeType, data).slice(0, 2);
  const assigneeInitials = nodeType === 'task' ? getInitials(data.assignee) : null;
  const statusLabel = getNodeStatus(nodeType, data);
  const iconLabel = getNodeIcon(nodeType);

  return (
    <div className={`node-card ${colorClass} ${selected ? 'node-selected' : ''}`}>
      {hasTarget ? <Handle type="target" position={Position.Top} /> : null}
      <div className="node-status-strip">
        <span className="node-icon">{iconLabel}</span>
        <span className="node-status">{statusLabel}</span>
      </div>
      <div className="node-header">
        <div className="node-title-wrap">
          <div className="node-eyebrow">{nodeType.toUpperCase()}</div>
          <div className="node-title">{data.title || 'Untitled'}</div>
        </div>
        {assigneeInitials ? <div className="node-avatar">{assigneeInitials}</div> : totalMeta > 0 ? <div className="node-badge">{totalMeta}</div> : null}
      </div>
      {taskPreview ? (
        <div className="node-description-preview">{taskPreview.previewText}</div>
      ) : null}
      {subtitle ? <div className="node-subtitle">{subtitle}</div> : null}
      {metaTags.length ? (
        <div className="node-meta-row">
          {metaTags.map((tag) => (
            <span key={tag} className="node-meta-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {hasSource ? <Handle type="source" position={Position.Bottom} /> : null}
    </div>
  );
};

export const getNodeSubtitle = (type: WorkflowNodeType, data: WorkflowNodeData): string => {
  if (type === 'task') {
    return data.assignee ? `Assignee: ${data.assignee}` : 'Human Task';
  }
  if (type === 'approval') return data.approverRole ? `Role: ${data.approverRole}` : 'Approval Step';
  if (type === 'automated') return data.actionId ? `Action: ${data.actionId}` : 'System Action';
  if (type === 'end') return data.summaryFlag ? 'Summary Enabled' : 'Workflow End';
  return 'Workflow Start';
};
