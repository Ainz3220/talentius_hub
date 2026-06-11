const map = {
  ACTIVE:      { cls: 'badge-active',      label: 'Active' },
  INACTIVE:    { cls: 'badge-inactive',    label: 'Inactive' },
  PENDING:     { cls: 'badge-pending',     label: 'Pending' },
  TRANSFERRED: { cls: 'badge-transferred', label: 'Transferred' },
  EXPIRED:     { cls: 'badge-expired',     label: 'Expired' },
  REPATRIATED: { cls: 'badge-repatriated', label: 'Repatriated' },
  APPROVED:    { cls: 'badge-approved',    label: 'Approved' },
  REJECTED:    { cls: 'badge-rejected',    label: 'Rejected' },
  IN_PROGRESS: { cls: 'badge-in_progress', label: 'In Progress' },
  COMPLETED:   { cls: 'badge-completed',   label: 'Completed' },
  ARCHIVED:    { cls: 'badge-archived',    label: 'Archived' },
  COMPANY:     { cls: 'badge-company',     label: 'Company' },
  INDIVIDUAL:  { cls: 'badge-individual',  label: 'Individual' },
  GLOBAL:      { cls: 'badge-global',      label: 'Global' },
  CUSTOM:      { cls: 'badge-custom',      label: 'Custom' },
};

export function StatusBadge({ status }) {
  const cfg = map[status] || { cls: 'badge-archived', label: status };
  return <span className={`badge-dot ${cfg.cls}`}>{cfg.label}</span>;
}
