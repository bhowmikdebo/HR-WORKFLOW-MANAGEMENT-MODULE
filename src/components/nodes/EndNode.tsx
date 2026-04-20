import { Node, NodeProps } from '@xyflow/react';
import { BaseNode, getNodeSubtitle } from './BaseNode';
import { WorkflowNodeData } from '../../types/workflow';

type EndCanvasNode = Node<WorkflowNodeData, 'end'>;

export const EndNode = (props: NodeProps<EndCanvasNode>) => {
  return <BaseNode {...props} colorClass="node-end" nodeType="end" subtitle={getNodeSubtitle('end', props.data)} hasSource={false} />;
};
