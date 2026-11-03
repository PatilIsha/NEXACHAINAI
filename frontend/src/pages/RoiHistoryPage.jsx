import { useState } from 'react';
import { roiApi } from '../api/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Card, DataTable, PageHeader } from '../components/ui/index.jsx';
import { formatDate, formatDateTime, formatMoney } from '../utils/format.js';

export default function RoiHistoryPage() {
  const [page, setPage] = useState(1);
  const history = useFetch(() => roiApi.history({ page, limit: 15 }), [page]);

  const columns = [
    { key: 'roiDate', header: 'ROI date', render: (r) => formatDate(r.roiDate) },
    {
      key: 'investment',
      header: 'Investment',
      render: (r) => (
        <>
          <strong>{r.investment?.plan?.name || '-'}</strong>
          <span className="sub">
            {formatMoney(r.investment?.amount)} @ {r.investment?.dailyRoiPercent}% / day
          </span>
        </>
      ),
    },
    { key: 'amount', header: 'ROI amount', align: 'right', render: (r) => formatMoney(r.amount) },
    { key: 'date', header: 'Credited at', render: (r) => formatDateTime(r.date) },
    { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
  ];

  return (
    <>
      <PageHeader title="ROI history" subtitle="Every daily ROI credit, newest first" />
      <Card title="Daily ROI credits" subtitle={history.meta ? `${history.meta.total} records` : undefined} flush>
        <DataTable
          columns={columns}
          rows={history.data}
          loading={history.loading}
          error={history.error}
          onRetry={history.refetch}
          meta={history.meta}
          onPageChange={setPage}
          emptyTitle="No ROI credited yet"
          emptyMessage="ROI is credited every day at 12:00 AM for active investments."
        />
      </Card>
    </>
  );
}
