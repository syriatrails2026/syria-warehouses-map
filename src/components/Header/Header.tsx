import { PROJECT_NAME } from '../../config';
import './Header.css';

export function Header() {
  return (
    <header className="app-header">
      <span className="app-header__title">{PROJECT_NAME}</span>
    </header>
  );
}
