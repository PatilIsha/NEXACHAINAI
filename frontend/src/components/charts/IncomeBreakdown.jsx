import { formatMoney } from '../../utils/format.js';

const COLORS = { roi: 'var(--series-1)', levelIncome: 'var(--series-2)' };

/**
 * One whole split into parts: a thin segmented bar + legend rows with amounts.
 * breakdown: [{ key, label, value }]
 */
export default function IncomeBreakdown({ breakdown = [] }) {
  const total = breakdown.reduce((s, b) => s + (b.value || 0), 0);

  return (
    <div>
      <div className="small muted">Total earnings</div>
      <div className="hero">{formatMoney(total)}</div>
      <div className="segbar" style={{ marginTop: 16 }} role="img" aria-label={`Earnings split: ${breakdown.map((b) => `${b.label} ${formatMoney(b.value)}`).join(', ')}`}>
        {total > 0 &&
          breakdown
            .filter((b) => b.value > 0)
            .map((b) => <span key={b.key} style={{ width: `${(b.value / total) * 100}%`, background: COLORS[b.key] }} />)}
      </div>
      <div className="breakdown">
        {breakdown.map((b) => (
          <div className="breakdown-row" key={b.key}>
            <span className="k">
              <span className="legend-key swatch" style={{ background: COLORS[b.key] }} /> {b.label}
            </span>
            <span className="v">
              {formatMoney(b.value)}
              <span className="share">{total > 0 ? `${Math.round((b.value / total) * 100)}%` : '0%'}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
