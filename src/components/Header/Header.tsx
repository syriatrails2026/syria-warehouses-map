import { PROJECT_NAME } from '../../config';
import './Header.css';

interface HeaderProps {
  onOpenAbout: () => void;
}

export function Header({ onOpenAbout }: HeaderProps) {
  return (
    <header className="app-header">
      <span className="app-header__title">{PROJECT_NAME}</span>
      <button className="app-header__about-link" onClick={onOpenAbout}>
        عن المشروع
      </button>
    </header>
  );
}
