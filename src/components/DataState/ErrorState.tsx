import './ErrorState.css';

interface ErrorStateProps {
  onRetry: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state__icon" aria-hidden="true">
        ⚠️
      </div>
      <p className="error-state__title">تعذّر تحميل بيانات المخازن</p>
      <p className="error-state__hint">تحقق من اتصالك بالإنترنت</p>
      <button className="error-state__retry" onClick={onRetry}>
        إعادة المحاولة
      </button>
    </div>
  );
}
