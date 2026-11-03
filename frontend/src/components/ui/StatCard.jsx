import { Skeleton } from './index.jsx';

/** Headline number tile: label, value, optional hint and icon. */
export default function StatCard({ label, value, hint, icon: Icon, tone = '', loading }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className={`stat-icon ${tone}`}>
            <Icon />
          </span>
        )}
      </div>
      {loading ? <Skeleton height={28} width="60%" /> : <div className="stat-value">{value}</div>}
      {hint && <div className="stat-hint">{loading ? <Skeleton height={12} width="40%" /> : hint}</div>}
    </div>
  );
}
