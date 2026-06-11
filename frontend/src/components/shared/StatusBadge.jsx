import { Badge } from '../ui/badge.jsx';

const map = {
  ACTIVE: { variant: 'success', label: 'Active' },
  INACTIVE: { variant: 'outline', label: 'Inactive' },
  PENDING: { variant: 'warning', label: 'Pending' },
  TRANSFERRED: { variant: 'info', label: 'Transferred' },
  EXPIRED: { variant: 'destructive', label: 'Expired' },
  REPATRIATED: { variant: 'outline', label: 'Repatriated' },
  APPROVED: { variant: 'success', label: 'Approved' },
  REJECTED: { variant: 'destructive', label: 'Rejected' },
  IN_PROGRESS: { variant: 'info', label: 'In Progress' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  ARCHIVED: { variant: 'outline', label: 'Archived' },
  COMPANY: { variant: 'default', label: 'Company' },
  INDIVIDUAL: { variant: 'info', label: 'Individual' },
  GLOBAL: { variant: 'default', label: 'Global' },
  CUSTOM: { variant: 'secondary', label: 'Custom' },
};

export function StatusBadge({ status }) {
  const cfg = map[status] || { variant: 'default', label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
