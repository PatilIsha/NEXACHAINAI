import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatMoney, formatShortDay } from '../../utils/format.js';
import { EmptyState } from '../ui/index.jsx';

// Fixed series order: identity never changes with the data.
const SERIES = [
  { key: 'roi', label: 'Daily ROI', color: 'var(--series-1)' },
  { key: 'levelIncome', label: 'Level income', color: 'var(--series-2)' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="tooltip">
      <div className="tooltip-title">{formatShortDay(label)}</div>
      {SERIES.map((s) => (
        <div className="tooltip-row" key={s.key}>
          <span className="k">
            <span className="legend-key" style={{ background: s.color }} /> {s.label}
          </span>
          <span className="v">{formatMoney(point[s.key])}</span>
        </div>
      ))}
      <div className="tooltip-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 6 }}>
        <span className="k">Total</span>
        <span className="v">{formatMoney(point.total)}</span>
      </div>
    </div>
  );
}

/** 30-day earnings: two 2px lines with a 10% area wash, crosshair tooltip, legend above. */
export default function EarningsChart({ series = [] }) {
  const hasData = series.some((p) => p.total > 0);
  if (!hasData) return <EmptyState title="No earnings yet" message="ROI and level income will appear here once credited." />;

  return (
    <div>
      <div className="chart-legend" style={{ marginBottom: 12 }}>
        {SERIES.map((s) => (
          <span className="legend-item" key={s.key}>
            <span className="legend-key" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} strokeWidth={1} />
            <XAxis dataKey="date" tickFormatter={formatShortDay} tickLine={false} axisLine={false} minTickGap={28} dy={6} />
            <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<ChartTooltip />} cursor={{ strokeWidth: 1 }} />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)', fill: s.color }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
