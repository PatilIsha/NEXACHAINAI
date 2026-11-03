import { useMemo, useState } from 'react';
import { investmentApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';

/** Plan picker + amount with a live return preview. Calls onCreated(investment) on success. */
export default function InvestmentForm({ plans = [], onCreated }) {
  const toast = useToast();
  const [planCode, setPlanCode] = useState(plans[0]?.code || '');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const plan = useMemo(() => plans.find((p) => p.code === planCode) || plans[0], [plans, planCode]);
  const value = Number(amount) || 0;
  const daily = plan ? (value * plan.dailyRoiPercent) / 100 : 0;
  const endDate = plan ? new Date(Date.now() + plan.durationDays * 86400000) : null;
  const inRange = plan && value >= plan.minAmount && value <= plan.maxAmount;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!plan) return;
    if (!inRange) {
      setError(`Amount must be between ${formatMoney(plan.minAmount)} and ${formatMoney(plan.maxAmount)} for the ${plan.name} plan`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await investmentApi.create({ planCode: plan.code, amount: value });
      toast.success(`Invested ${formatMoney(value)} in the ${plan.name} plan`);
      setAmount('');
      onCreated?.(res.data);
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label>Choose a plan</label>
        <div className="plan-grid" role="radiogroup">
          {plans.map((p) => (
            <button
              type="button"
              key={p.code}
              role="radio"
              aria-checked={p.code === plan?.code}
              className={`plan-option ${p.code === plan?.code ? 'selected' : ''}`}
              onClick={() => setPlanCode(p.code)}
            >
              <div className="plan-name">{p.name}</div>
              <div className="plan-roi">{p.dailyRoiPercent}% / day</div>
              <div className="plan-meta">
                {p.durationDays} days · {formatMoney(p.minAmount)} - {formatMoney(p.maxAmount)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="amount">Amount (INR)</label>
        <input
          id="amount"
          className={`input ${error ? 'invalid' : ''}`}
          type="number"
          min={plan?.minAmount}
          max={plan?.maxAmount}
          step="1"
          placeholder={plan ? `${plan.minAmount} - ${plan.maxAmount}` : ''}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {error && <span className="field-error">{error}</span>}
      </div>

      <div className="preview">
        <div>
          <div className="k">Daily ROI</div>
          <div className="v">{formatMoney(daily)}</div>
        </div>
        <div>
          <div className="k">Total ROI ({plan?.durationDays || 0} days)</div>
          <div className="v">{formatMoney(daily * (plan?.durationDays || 0))}</div>
        </div>
        <div>
          <div className="k">Ends on</div>
          <div className="v">{endDate ? formatDate(endDate) : '-'}</div>
        </div>
      </div>
      <p className="help">ROI starts accruing from the day after the investment and is credited daily at 12:00 AM.</p>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !plan}>
        {submitting ? 'Creating...' : 'Invest now'}
      </button>
    </form>
  );
}
