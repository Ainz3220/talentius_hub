export default function StatusBadge({ status }) {
  const map = {
    ACTIVE: 'badge badge-active',
    PENDING: 'badge badge-pending',
    TRANSFERRED: 'badge badge-transferred',
    EXPIRED: 'badge badge-expired',
    REPATRIATED: 'badge badge-repatriated',
    INACTIVE: 'badge badge-inactive',
    COMPANY: 'badge badge-company',
    INDIVIDUAL: 'badge badge-individual',
    IN_PROGRESS: 'badge badge-in-progress',
    COMPLETED: 'badge badge-completed',
    ARCHIVED: 'badge badge-inactive',
    APPROVED: 'badge badge-approved',
    REJECTED: 'badge badge-rejected',
  };

  const labels = {
    ACTIVE: 'Active',
    PENDING: 'Pending',
    TRANSFERRED: 'Transferred',
    EXPIRED: 'Expired',
    REPATRIATED: 'Repatriated',
    INACTIVE: 'Inactive',
    COMPANY: 'Company',
    INDIVIDUAL: 'Individual',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };

  return (
    <span className={map[status] || 'badge badge-inactive'}>
      {labels[status] || status}
    </span>
  );
}
