import { useState } from 'react';
import { Badge } from '../ui/index.jsx';
import { IconChevronDown, IconChevronRight } from '../ui/Icons.jsx';
import { formatMoney, initials } from '../../utils/format.js';

function TreeNode({ node, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children?.length > 0;

  return (
    <li className={node.level === 0 ? 'tree-root' : ''}>
      <div className="tree-node">
        <button
          type="button"
          className={`tree-toggle ${hasChildren ? '' : 'placeholder'}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse' : 'Expand'}
          aria-expanded={open}
        >
          {open ? <IconChevronDown /> : <IconChevronRight />}
        </button>
        <div className="avatar" aria-hidden>{initials(node.fullName)}</div>
        <div className="tree-main">
          <span className="name">
            {node.fullName} {node.level === 0 && <span className="muted small">(you)</span>}
          </span>
          <span className="meta">
            {node.referralCode} · {node.email}
          </span>
        </div>
        <div className="tree-right">
          {node.level > 0 && <span className="badge badge-level">Level {node.level}</span>}
          <span className="mono">{formatMoney(node.totalInvested)}</span>
          <Badge>{node.status}</Badge>
          {hasChildren && <span className="muted small">{node.children.length} direct</span>}
        </div>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child._id} node={child} defaultOpen={child.level < 2} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Nested referral hierarchy (root = current user). */
export default function ReferralTree({ tree }) {
  if (!tree) return null;
  return (
    <ul className="tree">
      <TreeNode node={tree} defaultOpen />
    </ul>
  );
}
