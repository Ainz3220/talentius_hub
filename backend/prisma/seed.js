import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const HMAC_SECRET = process.env.HMAC_SECRET;

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function hmac(text) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(String(text).toLowerCase()).digest('hex');
}

async function main() {
  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = 'admin@talenthub.com';
  const adminPassword = 'Admin@1234';

  let admin = await prisma.user.findUnique({ where: { emailHash: hmac(adminEmail) } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        emailEncrypted: encrypt(adminEmail),
        emailHash: hmac(adminEmail),
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });
    console.log(`✓ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('Admin already exists, skipping.');
  }

  // ── Staff users ─────────────────────────────────────────────────────────────
  const staffAccounts = [
    { email: 'manager@talenthub.com', role: 'MANAGER', name: 'Sarah Wong' },
    { email: 'staff1@talenthub.com',  role: 'STAFF',   name: 'Ali Hassan' },
    { email: 'staff2@talenthub.com',  role: 'STAFF',   name: 'Priya Nair' },
  ];
  for (const acc of staffAccounts) {
    const exists = await prisma.user.findUnique({ where: { emailHash: hmac(acc.email) } });
    if (!exists) {
      await prisma.user.create({
        data: {
          emailEncrypted: encrypt(acc.email),
          emailHash: hmac(acc.email),
          passwordHash: await bcrypt.hash('Staff@1234', 12),
          role: acc.role,
          isActive: true,
          emailVerified: true,
        },
      });
      console.log(`✓ User created: ${acc.email} (${acc.role})`);
    }
  }

  // ── System settings ─────────────────────────────────────────────────────────
  await prisma.systemSettings.upsert({
    where: { id: 'system' },
    update: {},
    create: { id: 'system' },
  });
  console.log('✓ Default settings seeded');

  // ── Clients ─────────────────────────────────────────────────────────────────
  const clientsData = [
    {
      type: 'COMPANY',
      name: 'Apex Manufacturing Sdn Bhd',
      registrationNoEnc: encrypt('202001023456'),
      contactNameEnc: encrypt('David Lim'),
      contactPhoneEnc: encrypt('+60123456789'),
      contactEmailEnc: encrypt('david.lim@apexmfg.com.my'),
      contactEmailHash: hmac('david.lim@apexmfg.com.my'),
      address: 'Lot 12, Jalan Industri 3, Shah Alam Industrial Park, 40150 Shah Alam, Selangor',
      status: 'ACTIVE',
    },
    {
      type: 'COMPANY',
      name: 'Mega Logistics Bhd',
      registrationNoEnc: encrypt('199801087654'),
      contactNameEnc: encrypt('Tan Mei Ling'),
      contactPhoneEnc: encrypt('+60187654321'),
      contactEmailEnc: encrypt('mailing@megalogistics.com.my'),
      contactEmailHash: hmac('mailing@megalogistics.com.my'),
      address: 'No. 5, Jalan Pelabuhan Utama, 42000 Port Klang, Selangor',
      status: 'ACTIVE',
    },
    {
      type: 'COMPANY',
      name: 'GreenTech Plantation Sdn Bhd',
      registrationNoEnc: encrypt('201501034567'),
      contactNameEnc: encrypt('Ahmad Razali'),
      contactPhoneEnc: encrypt('+60199876543'),
      contactEmailEnc: encrypt('ahmad@greentech.com.my'),
      contactEmailHash: hmac('ahmad@greentech.com.my'),
      address: 'KM 15, Jalan Bahau-Rompin, 72100 Bahau, Negeri Sembilan',
      status: 'ACTIVE',
    },
    {
      type: 'INDIVIDUAL',
      name: 'Rajesh Kumar',
      registrationNoEnc: encrypt('A12345678'),
      contactNameEnc: encrypt('Rajesh Kumar'),
      contactPhoneEnc: encrypt('+60112345678'),
      contactEmailEnc: encrypt('rajesh.kumar@gmail.com'),
      contactEmailHash: hmac('rajesh.kumar@gmail.com'),
      address: 'No. 22, Jalan SS2/55, 47300 Petaling Jaya, Selangor',
      status: 'ACTIVE',
    },
    {
      type: 'COMPANY',
      name: 'Sunrise Construction Sdn Bhd',
      registrationNoEnc: encrypt('200301056789'),
      contactNameEnc: encrypt('Lee Chong Wei'),
      contactPhoneEnc: encrypt('+60163456789'),
      contactEmailEnc: encrypt('lee.cw@sunriseconstruct.com.my'),
      contactEmailHash: hmac('lee.cw@sunriseconstruct.com.my'),
      address: 'Suite 18-3, Menara Puchong, Jalan Puchong, 58200 Kuala Lumpur',
      status: 'INACTIVE',
    },
  ];

  const clients = [];
  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({ where: { name: c.name } });
    if (!existing) {
      const created = await prisma.client.create({ data: c });
      clients.push(created);
      console.log(`✓ Client: ${c.name}`);
    } else {
      clients.push(existing);
    }
  }

  // ── Dormitories ─────────────────────────────────────────────────────────────
  const dormsData = [
    {
      name: 'Shah Alam Worker Lodge A',
      address: 'No. 3, Lorong Pekerja 1, Seksyen 15, 40200 Shah Alam, Selangor',
      state: 'Selangor',
      capacity: 80,
      pic: 'Encik Zulkifli',
      status: 'ACTIVE',
    },
    {
      name: 'Shah Alam Worker Lodge B',
      address: 'No. 7, Lorong Pekerja 2, Seksyen 15, 40200 Shah Alam, Selangor',
      state: 'Selangor',
      capacity: 60,
      pic: 'Puan Noraini',
      status: 'ACTIVE',
    },
    {
      name: 'Port Klang Dormitory',
      address: 'Jalan Pelabuhan Lama, 42000 Port Klang, Selangor',
      state: 'Selangor',
      capacity: 120,
      pic: 'Mr. Rajan',
      status: 'ACTIVE',
    },
    {
      name: 'Nilai Workers Hostel',
      address: 'Kawasan Perindustrian Nilai, 71800 Nilai, Negeri Sembilan',
      state: 'Negeri Sembilan',
      capacity: 50,
      pic: 'Encik Farid',
      status: 'ACTIVE',
    },
    {
      name: 'Old Klang Road Hostel',
      address: 'No. 88, Jalan Klang Lama, 58100 Kuala Lumpur',
      state: 'Kuala Lumpur',
      capacity: 40,
      pic: 'Ms. Susan Tan',
      status: 'INACTIVE',
    },
  ];

  const dorms = [];
  for (const d of dormsData) {
    const existing = await prisma.dormitory.findFirst({ where: { name: d.name } });
    if (!existing) {
      const created = await prisma.dormitory.create({ data: d });
      dorms.push(created);
      console.log(`✓ Dormitory: ${d.name}`);
    } else {
      dorms.push(existing);
    }
  }

  // ── Expats ──────────────────────────────────────────────────────────────────
  const expatsData = [
    // Apex Manufacturing
    { clientIdx: 0, dormIdx: 0, fullName: 'Mohammad Iqbal', passportNo: 'BP1234567', nationality: 'Bangladeshi', dob: '1992-03-15', phone: '+8801711223344', status: 'ACTIVE', permitExpiry: '2025-11-30' },
    { clientIdx: 0, dormIdx: 0, fullName: 'Suresh Babu',    passportNo: 'P2345678',  nationality: 'Indian',       dob: '1989-07-22', phone: '+919876543210', status: 'ACTIVE', permitExpiry: '2026-01-15' },
    { clientIdx: 0, dormIdx: 0, fullName: 'Nguyen Van Thanh', passportNo: 'B3456789', nationality: 'Vietnamese', dob: '1995-11-01', phone: '+84912345678', status: 'ACTIVE', permitExpiry: '2026-04-30' },
    { clientIdx: 0, dormIdx: 1, fullName: 'Myo Aung',       passportNo: 'MA456789', nationality: 'Myanmar',      dob: '1991-05-10', phone: '+959123456789', status: 'ACTIVE', permitExpiry: '2025-08-20' },
    { clientIdx: 0, dormIdx: 1, fullName: 'Karim Uddin',    passportNo: 'BP5678901', nationality: 'Bangladeshi', dob: '1994-09-18', phone: '+8801812345678', status: 'PENDING', permitExpiry: null },
    // Mega Logistics
    { clientIdx: 1, dormIdx: 2, fullName: 'Ramesh Patel',   passportNo: 'P6789012',  nationality: 'Indian',       dob: '1987-12-05', phone: '+917654321098', status: 'ACTIVE', permitExpiry: '2026-06-10' },
    { clientIdx: 1, dormIdx: 2, fullName: 'Tran Minh Duc',  passportNo: 'B7890123',  nationality: 'Vietnamese',   dob: '1993-02-28', phone: '+84987654321', status: 'ACTIVE', permitExpiry: '2026-02-28' },
    { clientIdx: 1, dormIdx: 2, fullName: 'Win Zaw',        passportNo: 'MA890123',  nationality: 'Myanmar',      dob: '1990-08-14', phone: '+959876543210', status: 'TRANSFERRED', permitExpiry: '2025-12-31' },
    { clientIdx: 1, dormIdx: 2, fullName: 'Samsul Haque',   passportNo: 'BP9012345', nationality: 'Bangladeshi',  dob: '1996-06-25', phone: '+8801611223344', status: 'ACTIVE', permitExpiry: '2026-05-15' },
    // GreenTech Plantation
    { clientIdx: 2, dormIdx: 3, fullName: 'Ravi Shankar',   passportNo: 'P0123456',  nationality: 'Indian',       dob: '1985-04-12', phone: '+918765432109', status: 'ACTIVE', permitExpiry: '2025-07-31' },
    { clientIdx: 2, dormIdx: 3, fullName: 'Pham Van Long',  passportNo: 'B1234568',  nationality: 'Vietnamese',   dob: '1998-01-09', phone: '+84901234567', status: 'ACTIVE', permitExpiry: '2026-03-20' },
    { clientIdx: 2, dormIdx: 3, fullName: 'Kyaw Zin',       passportNo: 'MA234568',  nationality: 'Myanmar',      dob: '1992-10-30', phone: '+959234567890', status: 'EXPIRED', permitExpiry: '2024-12-31' },
    // Individual client
    { clientIdx: 3, dormIdx: 0, fullName: 'Dinesh Kumar',   passportNo: 'P3456789',  nationality: 'Indian',       dob: '1997-07-07', phone: '+916543210987', status: 'ACTIVE', permitExpiry: '2026-07-01' },
    // Sunrise (inactive client)
    { clientIdx: 4, dormIdx: null, fullName: 'Abdul Karim', passportNo: 'BP4567890', nationality: 'Bangladeshi',  dob: '1988-03-20', phone: '+8801512345678', status: 'REPATRIATED', permitExpiry: null },
  ];

  const expats = [];
  for (let idx = 0; idx < expatsData.length; idx++) {
    const e = expatsData[idx];
    const expatNo = `EXP-${String(idx + 1).padStart(4, '0')}`;
    const existing = await prisma.expat.findUnique({ where: { expatNo } });
    if (!existing) {
      const created = await prisma.expat.create({
        data: {
          expatNo,
          clientId: clients[e.clientIdx].id,
          dormitoryId: e.dormIdx !== null ? dorms[e.dormIdx].id : null,
          fullName: e.fullName,
          passportNoEnc: encrypt(e.passportNo),
          nationality: e.nationality,
          dateOfBirthEnc: e.dob ? encrypt(e.dob) : null,
          phoneEnc: e.phone ? encrypt(e.phone) : null,
          status: e.status,
          permitExpiry: e.permitExpiry ? new Date(e.permitExpiry) : null,
        },
      });
      expats.push(created);
    } else {
      expats.push(existing);
    }
  }
  console.log(`✓ ${expats.length} expats seeded`);

  // ── Transfers ───────────────────────────────────────────────────────────────
  const transfersData = [
    {
      expatIdx: 7, // Win Zaw — transferred
      fromDormIdx: 2,
      toDormIdx: 1,
      fromClientIdx: 1,
      toClientIdx: 0,
      reason: 'Client requested reallocation due to project completion at Port Klang.',
      status: 'APPROVED',
      requestedBy: admin.id,
      approvedBy: admin.id,
      effectiveDate: new Date('2025-05-10'),
    },
    {
      expatIdx: 3, // Myo Aung — pending transfer
      fromDormIdx: 0,
      toDormIdx: 2,
      fromClientIdx: 0,
      toClientIdx: 1,
      reason: 'Additional manpower needed at Port Klang operations.',
      status: 'PENDING',
      requestedBy: admin.id,
      effectiveDate: new Date('2025-07-01'),
    },
    {
      expatIdx: 9, // Ravi Shankar — pending transfer between dorms
      fromDormIdx: 3,
      toDormIdx: 0,
      fromClientIdx: 2,
      toClientIdx: 2,
      reason: 'Dormitory capacity exceeded at Nilai. Relocating to Shah Alam.',
      status: 'REJECTED',
      requestedBy: admin.id,
      rejectedBy: admin.id,
      rejectionReason: 'Target dormitory is also near capacity.',
      effectiveDate: null,
    },
  ];

  for (const t of transfersData) {
    const existing = await prisma.expatTransfer.findFirst({
      where: { expatId: expats[t.expatIdx].id, reason: t.reason },
    });
    if (!existing) {
      await prisma.expatTransfer.create({
        data: {
          expatId: expats[t.expatIdx].id,
          fromDormitoryId: dorms[t.fromDormIdx].id,
          toDormitoryId: dorms[t.toDormIdx].id,
          fromClientId: clients[t.fromClientIdx].id,
          toClientId: clients[t.toClientIdx].id,
          reason: t.reason,
          status: t.status,
          requestedBy: t.requestedBy,
          approvedBy: t.approvedBy ?? null,
          rejectedBy: t.rejectedBy ?? null,
          rejectionReason: t.rejectionReason ?? null,
          effectiveDate: t.effectiveDate,
        },
      });
    }
  }
  console.log('✓ Transfers seeded');

  // ── Checklist templates ─────────────────────────────────────────────────────
  const templatesData = [
    {
      name: 'New Expat Onboarding',
      entityType: 'EXPAT',
      scope: 'GLOBAL',
      items: [
        'Verify passport and collect copy',
        'Submit work permit application to Immigration',
        'Complete medical examination (FOMEMA)',
        'Register with SOCSO',
        'Register with EPF (KWSP)',
        'Issue company ID card',
        'Conduct safety induction training',
        'Assign dormitory room',
        'Issue welcome kit and house rules',
        'Emergency contact form completed',
      ],
    },
    {
      name: 'Permit Renewal Checklist',
      entityType: 'EXPAT',
      scope: 'GLOBAL',
      items: [
        'Check current permit expiry date',
        'Gather passport (min 18 months validity)',
        'Prepare renewal application form',
        'Attach latest medical examination report',
        'Submit to Immigration at least 3 months before expiry',
        'Track application status online',
        'Collect renewed permit sticker',
        'Update permit expiry in system',
      ],
    },
    {
      name: 'Client Onboarding',
      entityType: 'CLIENT',
      scope: 'GLOBAL',
      items: [
        'Collect company registration documents (SSM)',
        'Sign service agreement',
        'Collect levy quota approval letter',
        'Set up client profile in system',
        'Assign account manager',
        'Brief client on compliance requirements',
      ],
    },
    {
      name: 'Dormitory Inspection',
      entityType: 'DORMITORY',
      scope: 'GLOBAL',
      items: [
        'Check room capacity and current occupancy',
        'Inspect fire safety equipment (extinguishers, alarms)',
        'Verify clean water supply and sanitation',
        'Check electrical safety (no exposed wiring)',
        'Inspect kitchen/dining area hygiene',
        'Verify first-aid kit is stocked',
        'Check emergency exit routes are clear',
        'Confirm CCTV systems operational',
      ],
    },
  ];

  const templates = [];
  for (const t of templatesData) {
    const existing = await prisma.checklistTemplate.findFirst({ where: { name: t.name } });
    if (!existing) {
      const created = await prisma.checklistTemplate.create({
        data: {
          name: t.name,
          entityType: t.entityType,
          scope: t.scope,
          items: {
            create: t.items.map((itemText, order) => ({ itemText, order })),
          },
        },
      });
      templates.push(created);
      console.log(`✓ Template: ${t.name}`);
    } else {
      templates.push(existing);
    }
  }

  // ── Sample checklists (attached to a few expats) ────────────────────────────
  const onboardingTemplate = templates[0];
  if (onboardingTemplate) {
    const templateWithItems = await prisma.checklistTemplate.findUnique({
      where: { id: onboardingTemplate.id },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    for (let i = 0; i < 3; i++) {
      const expat = expats[i];
      const existing = await prisma.checklist.findFirst({
        where: { entityType: 'EXPAT', entityId: expat.id, templateId: onboardingTemplate.id },
      });
      if (!existing) {
        await prisma.checklist.create({
          data: {
            templateId: onboardingTemplate.id,
            entityType: 'EXPAT',
            entityId: expat.id,
            name: `Onboarding – ${expat.fullName}`,
            status: i === 0 ? 'COMPLETED' : 'IN_PROGRESS',
            items: {
              create: templateWithItems.items.map((ti, idx) => ({
                itemText: ti.itemText,
                order: ti.order,
                status: i === 0 ? 'DONE' : idx < 5 ? 'DONE' : 'PENDING',
                completedBy: (i === 0 || idx < 5) ? admin.id : null,
                completedAt: (i === 0 || idx < 5) ? new Date() : null,
              })),
            },
          },
        });
      }
    }
    console.log('✓ Sample checklists seeded');
  }

  console.log('\n✓ Seed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
