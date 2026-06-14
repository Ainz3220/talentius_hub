/**
 * Expat filter overrides — the ONLY file you touch when adding new fields.
 *
 * New Prisma columns are auto-discovered via information_schema and land in the
 * "Other" category as text/number/date filters automatically.
 * Edit this file only to:
 *   - Hide a column  (add to SKIP_COLUMNS)
 *   - Change its filter type or label  (add to COLUMN_CONFIG)
 *   - Move it to a named category  (add category: '...' in COLUMN_CONFIG)
 *   - Add a virtual/computed filter  (add to VIRTUAL_FIELDS)
 */

// Columns that must never appear in filters (encrypted or internal DB keys only)
export const SKIP_COLUMNS = new Set([
  'id',
  'passportNoEnc',
  'dateOfBirthEnc',
  'phoneEnc',
]);

/**
 * Per-column customisations.
 * Any column not listed here is auto-detected with:
 *   label    → converted from camelCase  (e.g. "permitExpiry" → "Permit Expiry")
 *   type     → mapped from the PostgreSQL data_type
 *   category → "Other"
 */
export const COLUMN_CONFIG = {
  expatNo:      { label: 'Expat No.',        category: 'General'     },
  fullName:     { label: 'Name',             category: 'General'     },
  nationality:  { label: 'Nationality',      category: 'General',
                  type: 'select', optionsSource: 'distinct:nationality' },
  status:       { label: 'Status',           category: 'General',
                  type: 'select', options: [
                    { value: 'PENDING',     label: 'Pending'     },
                    { value: 'ACTIVE',      label: 'Active'      },
                    { value: 'TRANSFERRED', label: 'Transferred' },
                    { value: 'EXPIRED',     label: 'Expired'     },
                    { value: 'REPATRIATED', label: 'Repatriated' },
                  ]},
  clientId:     { label: 'Client',           category: 'Assignments',
                  type: 'select', optionsSource: 'model:Client' },
  dormitoryId:  { label: 'Dormitory',        category: 'Assignments',
                  type: 'select', optionsSource: 'model:Dormitory' },
  permitExpiry: { label: 'Permit Expiry',    category: 'Dates'       },
  createdAt:    { label: 'Registered On',    category: 'Dates'       },
  updatedAt:    { label: 'Last Updated',     category: 'Dates'       },
  /*
   * New field example — paste below and customise:
   *
   * visaNo:        { label: 'Visa No.',      category: 'Documents' },
   * bloodType:     { label: 'Blood Type',    category: 'Personal',
   *                  type: 'select', options: [
   *                    { value: 'A', label: 'A' }, { value: 'B', label: 'B' },
   *                    { value: 'O', label: 'O' }, { value: 'AB', label: 'AB' },
   *                  ]},
   * religion:      { label: 'Religion',      category: 'Personal',
   *                  type: 'select', optionsSource: 'distinct:religion' },
   * yearsExp:      { label: 'Years Exp.',    category: 'Work' },   ← auto-detected as number
   * entryDate:     { label: 'Entry Date',    category: 'Dates' },  ← auto-detected as date
   */
};

/**
 * Virtual (non-column) filter entries — computed conditions not backed by a single column.
 */
export const VIRTUAL_FIELDS = [
  {
    key: 'unassigned', label: 'No Client (unassigned)', category: 'Assignments',
    type: 'boolean', clause: { clientId: null },
  },
];

/** Category display order — unknown categories are appended at the end. */
export const CATEGORY_ORDER = ['General', 'Assignments', 'Dates', 'Other'];
