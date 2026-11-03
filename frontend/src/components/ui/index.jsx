import { IconAlert, IconInbox, IconRefresh } from './Icons.jsx';

export function Card({ title, subtitle, actions, children, className = '', flush = false }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </header>
      )}
      <div className={`card-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function Spinner({ size }) {
  return <div className={`spinner ${size === 'lg' ? 'lg' : ''}`} role="progressbar" aria-label="Loading" />;
}

export function Skeleton({ width = '100%', height = 16, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="state error" role="alert">
      <IconAlert width={28} height={28} />
      <h3>Could not load data</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          <IconRefresh /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message }) {
  return (
    <div className="state">
      <IconInbox width={28} height={28} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  );
}

const TONES = { Active: 'success', Completed: 'info', Cancelled: 'danger', active: 'success', suspended: 'warning', blocked: 'danger', credited: 'success', pending: 'warning', failed: 'danger' };

export function Badge({ tone, children }) {
  const t = tone || TONES[children] || '';
  return <span className={`badge ${t ? `badge-${t}` : ''}`}>{children}</span>;
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="pagination">
      <span>
        Showing {from}-{to} of {total}
      </span>
      <div className="pagination-controls">
        <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * Generic table with loading / error / empty states.
 * columns: [{ key, header, render?, align?: 'right', width? }]
 */
export function DataTable({ columns, rows, loading, error, onRetry, emptyTitle, emptyMessage, rowKey = '_id', meta, onPageChange }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading && !rows) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={18} />
        ))}
      </div>
    );
  }
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className={loading ? 'is-refreshing' : ''}>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === 'right' ? 'num' : ''} style={{ width: c.width }}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row[rowKey] ?? i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                    {c.render ? c.render(row, i) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta && onPageChange && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
}
