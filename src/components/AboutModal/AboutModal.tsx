import './AboutModal.css';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="about-modal-backdrop" onClick={onClose}>
      <div className="about-modal" role="dialog" aria-label="عن المشروع" onClick={(event) => event.stopPropagation()}>
        <button className="about-modal__close" onClick={onClose} aria-label="إغلاق">
          ×
        </button>
        <h2 className="about-modal__title">عن المشروع</h2>
        <p className="about-modal__text">
          منصّة عرض تفاعلية تُظهر توزّع 1,400 مخزن تابع لوزارة التجارة الداخلية على امتداد محافظات سوريا الأربع عشرة، بحدود
          جغرافية حقيقية وتصنيف هرمي دقيق (محافظة ← منطقة ← ناحية).
        </p>
        <p className="about-modal__text">
          الهدف من المنصّة تقديم صورة واضحة وقابلة للاستكشاف لحجم وتوزّع البنية التخزينية القائمة، تمهيداً للشراكة والاستثمار
          في تطويرها.
        </p>
      </div>
    </div>
  );
}
