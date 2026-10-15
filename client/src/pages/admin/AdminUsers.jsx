import { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import DataTable from '../../components/DataTable';
import useFetch from '../../hooks/useFetch';
import { adminApi } from '../../services/api';
import { fmtDate } from '../../utils/format';

export default function AdminUsers() {
  const { data, loading, error, reload } = useFetch(() => adminApi.users(), []);
  const [q, setQ] = useState('');
  const users = (data?.users || []).filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="animate-rise">
      <PageHeader title="Users" subtitle={data ? `${data.users.length} registered accounts` : ''} />
      <div className="relative mb-4 max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field pl-9" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /></div>
      {loading ? <Skeleton className="h-96" /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <DataTable rows={users} empty="No users match your search" columns={[
          { key: 'name', label: 'Name', render: (u) => <span className="font-semibold">{u.name}</span> },
          { key: 'email', label: 'Email', className: 'text-muted' },
          { key: 'role', label: 'Role', render: (u) => <Badge className={u.role === 'admin' ? 'bg-sun-50 text-sun-700 ring-sun-200' : 'bg-slate-50 text-muted ring-slate-200'}>{u.role}</Badge> },
          { key: 'tripCount', label: 'Trips', align: 'right', render: (u) => <span className="font-bold">{u.tripCount}</span> },
          { key: 'createdAt', label: 'Joined', render: (u) => fmtDate(u.createdAt), className: 'text-muted whitespace-nowrap' },
        ]} />
      )}
    </div>
  );
}
