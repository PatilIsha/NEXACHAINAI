import { useState } from 'react';
import { investmentApi } from '../api/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Card, DataTable, ErrorState, PageHeader, Skeleton } from '../components/ui/index.jsx';
import InvestmentForm from '../components/investments/InvestmentForm.jsx';
import { formatDate, formatMoney } from '../utils/format.js';

const PAGE_SIZE = 10;

export default function InvestmentsPage() {
  const { refreshUser } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const plans = useFetch(() => investmentApi.plans(), []);
  const list = useFetch(() => investmentApi.list({ page, limit: PAGE_SIZE, status: status || undefined }), [page, status]);

  const onCreated = () => {
    setPage(1);
    setStatus('');
    list.refetch();
    refreshUser().catch(() => {});
  };

  const columns = [
    {
      key: 'plan',
      header: 'Plan',
      render: (r) => (
        <>
          <strong>{r.plan?.name}</strong>
          <span className="sub">{r.plan?.code}</span>
        </>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatMoney(r.amount) },
    {
      key: 'dailyRoi',
      header: 'Daily ROI',
      align: 'right',
      render: (r) => (
        <>
          {formatMoney(r.dailyRoiAmount)}
          <span className="sub">{r.dailyRoiPercent}% / day</span>
        </>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="progress" aria-hidden>
            <span style={{ width: `${r.progressPercent || 0}%` }} />
          </div>
          <span className="small muted mono">
            {r.roiDaysPaid}/{r.durationDays} days
          </span>
        </div>
      ),
    },
    { key: 'startDate', header: 'Start', render: (r) => formatDate(r.startDate) },
    { key: 'endDate', header: 'End', render: (r) => formatDate(r.endDate) },
    { key: 'totalRoiPaid', header: 'ROI paid', align: 'right', render: (r) => formatMoney(r.totalRoiPaid) },
    { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Investments" subtitle="Create a new investment and track your existing ones" />

      <div className="grid grid-2">
        <Card
          title="Investment history"
          subtitle={list.meta ? `${list.meta.total} total` : undefined}
          flush
          actions={
            <select
              className="select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          }
        >
          <DataTable
            columns={columns}
            rows={list.data}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            meta={list.meta}
            onPageChange={setPage}
            emptyTitle="No investments yet"
            emptyMessage="Pick a plan on the right to make your first investment."
          />
        </Card>

        <Card title="New investment" subtitle="ROI is credited daily; referral income is paid to your upline">
          {plans.error ? (
            <ErrorState message={plans.error} onRetry={plans.refetch} />
          ) : plans.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height={90} />
              <Skeleton height={40} />
            </div>
          ) : (
            <InvestmentForm plans={plans.data} onCreated={onCreated} />
          )}
        </Card>
      </div>
    </>
  );
}
