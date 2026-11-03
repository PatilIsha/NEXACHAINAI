import { dashboardApi, referralApi, roiApi } from '../api/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, DataTable, ErrorState, PageHeader } from '../components/ui/index.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import EarningsChart from '../components/charts/EarningsChart.jsx';
import IncomeBreakdown from '../components/charts/IncomeBreakdown.jsx';
import ReferralCodeBox from '../components/referral/ReferralCodeBox.jsx';
import { IconLayers, IconPercent, IconRefresh, IconUsers, IconWallet } from '../components/ui/Icons.jsx';
import { formatDate, formatMoney, formatNumber } from '../utils/format.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const summary = useFetch(() => dashboardApi.summary(), []);
  const recentRoi = useFetch(() => roiApi.history({ page: 1, limit: 5 }), []);
  const recentIncome = useFetch(() => referralApi.income({ page: 1, limit: 5 }), []);

  const refresh = () => {
    summary.refetch();
    recentRoi.refetch();
    recentIncome.refetch();
  };

  const d = summary.data;
  const loading = summary.loading && !d;

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.fullName?.split(' ')[0] || 'there'}`}
        subtitle="Overview of your investments, earnings and referral network"
        actions={
          <button type="button" className="btn" onClick={refresh} disabled={summary.loading}>
            <IconRefresh /> Refresh
          </button>
        }
      />

      {summary.error ? (
        <Card>
          <ErrorState message={summary.error} onRetry={summary.refetch} />
        </Card>
      ) : (
        <>
          <div className="grid grid-stats">
            <StatCard
              label="Total investments"
              value={formatMoney(d?.cards.totalInvestments.amount)}
              hint={`${formatNumber(d?.cards.totalInvestments.count)} investments · ${formatNumber(d?.investments.active.count)} active`}
              icon={IconLayers}
              loading={loading}
            />
            <StatCard
              label="Daily ROI"
              value={formatMoney(d?.cards.dailyRoi.expected)}
              hint={`Credited today: ${formatMoney(d?.cards.dailyRoi.creditedToday)}`}
              icon={IconPercent}
              tone="success"
              loading={loading}
            />
            <StatCard
              label="Total level income"
              value={formatMoney(d?.cards.totalLevelIncome)}
              hint={`${formatNumber(d?.referrals.direct)} direct referrals`}
              icon={IconUsers}
              tone="warning"
              loading={loading}
            />
            <StatCard
              label="Wallet balance"
              value={formatMoney(d?.cards.walletBalance)}
              hint={`Total ROI earned: ${formatMoney(d?.cards.totalRoiEarned)}`}
              icon={IconWallet}
              loading={loading}
            />
          </div>

          <div className="grid grid-2">
            <Card title="Earnings - last 30 days" subtitle="Daily ROI and level income credited per day">
              <div className={summary.loading ? 'is-refreshing' : ''}>
                {d ? <EarningsChart series={d.earningsSeries} /> : <div className="chart skeleton" />}
              </div>
            </Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card title="Income breakdown">
                {d ? <IncomeBreakdown breakdown={d.incomeBreakdown} /> : <div className="skeleton" style={{ height: 120 }} />}
              </Card>
              <Card title="Your referral code" subtitle="Share it to grow your network">
                <ReferralCodeBox code={user?.referralCode} />
              </Card>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-equal">
        <Card title="Recent ROI credits" flush>
          <DataTable
            columns={[
              { key: 'roiDate', header: 'Date', render: (r) => formatDate(r.roiDate) },
              { key: 'investment', header: 'Plan', render: (r) => r.investment?.plan?.name || '-' },
              { key: 'amount', header: 'ROI', align: 'right', render: (r) => formatMoney(r.amount) },
            ]}
            rows={recentRoi.data}
            loading={recentRoi.loading}
            error={recentRoi.error}
            onRetry={recentRoi.refetch}
            emptyTitle="No ROI credited yet"
            emptyMessage="ROI is credited daily at 12:00 AM for active investments."
          />
        </Card>
        <Card title="Recent level income" flush>
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'fromUser', header: 'From', render: (r) => r.fromUser?.fullName || '-' },
              { key: 'level', header: 'Level', render: (r) => <span className="badge badge-level">L{r.level}</span> },
              { key: 'amount', header: 'Income', align: 'right', render: (r) => formatMoney(r.amount) },
            ]}
            rows={recentIncome.data}
            loading={recentIncome.loading}
            error={recentIncome.error}
            onRetry={recentIncome.refetch}
            emptyTitle="No level income yet"
            emptyMessage="You earn when people in your network invest."
          />
        </Card>
      </div>
    </>
  );
}
