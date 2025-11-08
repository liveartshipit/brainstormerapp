export interface Idea {
  id: string;
  text: string;
}

export type NodeShape = 'rectangle' | 'ellipse' | 'diamond';

export interface Node extends Idea {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: NodeShape;
  color: string;
}

export interface Connector {
  id:string;
  fromNodeId: string;
  toNodeId: string;
}

export type Tool = 'select' | 'connect';

export interface MindMapState {
  nodes: Node[];
  connectors: Connector[];
}

export interface HistoryState {
  past: MindMapState[];
  present: MindMapState;
  future: MindMapState[];
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
  subtasks: Task[];
}