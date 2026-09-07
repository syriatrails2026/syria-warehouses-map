import type { BreadcrumbItem } from '../../state/breadcrumb';
import type { Selection } from '../../state/selection';
import './Breadcrumb.css';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (selection: Selection) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="مسار التنقل">
      <button onClick={() => onNavigate({})}>سوريا</button>
      {items.map((item) => (
        <span key={item.label}>
          <span className="breadcrumb__sep">‹</span>
          <button onClick={() => onNavigate(item.selection)}>{item.label}</button>
        </span>
      ))}
    </nav>
  );
}
