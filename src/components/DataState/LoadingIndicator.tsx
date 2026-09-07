import './LoadingIndicator.css';

export function LoadingIndicator() {
  return (
    <div className="loading-indicator" role="status">
      <div className="loading-indicator__spinner" aria-hidden="true" />
      <p className="loading-indicator__text">جارٍ تحميل بيانات المخازن...</p>
    </div>
  );
}
