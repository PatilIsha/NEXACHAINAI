import { useState } from 'react';
import { referralApi } from '../api/endpoints.js';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Card, DataTable, ErrorState, PageHeader, Skeleton } from '../components/ui/index.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ReferralTree from '../components/referral/ReferralTree.jsx';
import ReferralCodeBox from '../components/referral/ReferralCodeBox.jsx';
import { IconLayers, IconUsers, IconWallet } from '../components/ui/Icons.jsx';
import { formatDate, formatMoney, formatNumber } from '../utils/format.js';

export default function ReferralsPage() {
  const { user } = useAuth();
  const [depth, setDepth] = useState(5);
  const [directPage, setDirectPage] = useState(1);
  const [incomePage, setIncomePage] = useState(1);

  const tree = useFetch(() => referralApi.tree({ depth }), [depth]);
  const direct = useFetch(() => referralApi.direct({ page: directPage, limit: 10 }), [directPage]);
  const income = useFetch(() => referralApi.income({ page: incomePage, limit: 10 }), [incomePage]);

  const levelCounts = tree.data?.levelCounts || {};

  return (
    <>
      <PageHeader title="Referrals" subtitle="Your network, level income and referral tree" />

      <Card title="Your referral code" subtitle="New users who sign up with this code join your network">
        <ReferralCodeBox code={user?.referralCode} />
      </Card>

      <div className="grid grid-stats">
        <StatCard label="Direct referrals" value={formatNumber(direct.meta?.total ?? 0)} icon={IconUsers} loading={direct.loading && !direct.data} />
        <StatCard label="Team size" value={formatNumber(tree.data?.totalMembers ?? 0)} hint={`within ${depth} levels`} icon={IconLayers} loading={tree.loading && !tree.data} />
        <StatCard
          label="Total level income"
          value={formatMoney(user?.totalLevelIncomeEarned)}
          hint={income.meta ? `${income.meta.total} payouts` : undefined}
          icon={IconWallet}
          tone="success"
        />
        <div className="card stat">
          <span className="stat-label">Members per level</span>
          <div className="level-pills">
            {Object.keys(levelCounts).length === 0 && <span className="muted small">No members yet</span>}
            {Object.entries(levelCounts).map(([level, count]) => (
              <span className="badge badge-level" key={level}>
                L{level}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Card
        title="Referral tree"
        subtitle="Nested view of everyone in your downline"
        actions={
          <select className="select" value={depth} onChange={(e) => setDepth(Number(e.target.value))} aria-label="Tree depth">
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} level{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        }
      >
        {tree.error ? (
          <ErrorState message={tree.error} onRetry={tree.refetch} />
        ) : !tree.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={40} />
            <Skeleton height={40} width="90%" />
            <Skeleton height={40} width="80%" />
          </div>
        ) : (
          <div className={tree.loading ? 'is-refreshing' : ''}>
            <ReferralTree tree={tree.data.tree} />
            {tree.data.totalMembers === 0 && <p className="muted small" style={{ marginTop: 12 }}>Share your referral code to start building your network.</p>}
          </div>
        )}
      </Card>

      <div className="grid grid-equal">
        <Card title="Direct referrals" flush>
          <DataTable
            columns={[
              {
                key: 'fullName',
                header: 'Member',
                render: (r) => (
                  <>
                    <strong>{r.fullName}</strong>
                    <span className="sub">{r.email}</span>
                  </>
                ),
              },
              { key: 'referralCode', header: 'Code' },
              { key: 'totalInvested', header: 'Invested', align: 'right', render: (r) => formatMoney(r.totalInvested) },
              { key: 'createdAt', header: 'Joined', render: (r) => formatDate(r.createdAt) },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
            rows={direct.data}
            loading={direct.loading}
            error={direct.error}
            onRetry={direct.refetch}
            meta={direct.meta}
            onPageChange={setDirectPage}
            emptyTitle="No direct referrals yet"
          />
        </Card>

        <Card title="Referral income history" flush>
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              {
                key: 'fromUser',
                header: 'From',
                render: (r) => (
                  <>
                    <strong>{r.fromUser?.fullName || '-'}</strong>
                    <span className="sub">
                      {r.investment?.plan?.name} · {formatMoney(r.investment?.amount)}
                    </span>
                  </>
                ),
              },
              { key: 'level', header: 'Level', render: (r) => <span className="badge badge-level">L{r.level} · {r.percentage}%</span> },
              { key: 'amount', header: 'Income', align: 'right', render: (r) => formatMoney(r.amount) },
            ]}
            rows={income.data}
            loading={income.loading}
            error={income.error}
            onRetry={income.refetch}
            meta={income.meta}
            onPageChange={setIncomePage}
            emptyTitle="No level income yet"
          />
        </Card>
      </div>
    </>
  );
}
