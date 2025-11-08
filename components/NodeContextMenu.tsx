import React from 'react';
import type { Node, NodeShape } from '../types';
import { SHAPE_ICONS, PALETTE_COLORS, DELETE_ICON } from '../constants';

interface NodeContextMenuProps {
  node: Node;
  updateNode: (id: string, data: Partial<Node>) => void;
  deleteNode: (id: string) => void;
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({ node, updateNode, deleteNode }) => {
  if (!node) return null;

  return (
    <div
      className="absolute bg-white/80 backdrop-blur-md shadow-2xl rounded-xl p-2 flex items-center space-x-1 z-30"
      style={{
        left: node.x + node.width / 2,
        top: node.y + node.height + 10,
        transform: 'translateX(-50%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center border-r pr-2 mr-1 space-x-1">
        {(Object.keys(SHAPE_ICONS) as NodeShape[]).map(shape => (
          <button
            key={shape}
            onClick={() => updateNode(node.id, { shape })}
            className={`p-1.5 rounded-md transition-colors ${node.shape === shape ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 text-gray-600'}`}
            title={`Shape: ${shape}`}
          >
            {SHAPE_ICONS[shape]}
          </button>
        ))}
      </div>
      <div className="flex items-center border-r pr-2 mr-1 space-x-1">
        {PALETTE_COLORS.map(color => (
          <button
            key={color}
            onClick={() => updateNode(node.id, { color })}
            className="h-6 w-6 rounded-full border-2 transition-transform transform hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: node.color === color ? '#2563EB' : 'transparent',
            }}
            title={color}
          />
        ))}
      </div>
      <button
        onClick={() => deleteNode(node.id)}
        className="p-2 rounded-md text-red-500 hover:bg-red-100 transition-colors"
        title="Delete Node"
      >
        {DELETE_ICON}
      </button>
    </div>
  );
};

export default NodeContextMenu;
