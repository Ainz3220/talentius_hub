import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt, hashForLookup } from '../src/config/encryption.js';
// Note: encrypt/hashForLookup used only for user account data (email), not entity fields

const prisma = new PrismaClient();
const ADMIN_ID = 'superadmin-talentius-fixed-id';

async function main() {
  console.log('Seeding database...');

  // System settings
  await prisma.systemSettings.upsert({
    where: { id: 'system' },
    update: {
      dashboardWidgets: ['kpi', 'doc-alerts', 'transfers', 'checklists', 'occupancy'],
      timezone: 'Indian/Mauritius',
    },
    create: {
      id: 'system',
      updatedBy: 'SYSTEM',
      dashboardWidgets: ['kpi', 'doc-alerts', 'transfers', 'checklists', 'occupancy'],
      timezone: 'Indian/Mauritius',
    },
  });

  // Super admin
  const passwordHash = await bcrypt.hash('DMO?!y9gXke;H?J",%O=', 12);
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    update: {
      passwordHash,
      email: encrypt('talentius@outlook.com'),
      emailLookupHash: hashForLookup('talentius@outlook.com'),
    },
    create: {
      id: ADMIN_ID,
      email: encrypt('talentius@outlook.com'),
      emailLookupHash: hashForLookup('talentius@outlook.com'),
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  // ── Dormitories ────────────────────────────────────────────────────────────
  const dorms = [
    { id: 'dorm-block-a', dormitoryNo: 'DOR0001', name: 'Block A', address: 'Jalan Kuching, 51200', state: 'Kuala Lumpur', capacity: 100, pic: 'Razali bin Hamid' },
    { id: 'dorm-block-b', dormitoryNo: 'DOR0002', name: 'Block B', address: 'Jalan Puchong Jaya, 47100', state: 'Selangor', capacity: 80, pic: null },
    { id: 'dorm-block-c', dormitoryNo: 'DOR0003', name: 'Block C', address: 'Jalan Indah 15, Shah Alam', state: 'Selangor', capacity: 120, pic: null },
  ];
  for (const d of dorms) {
    await prisma.dormitory.upsert({
      where: { id: d.id },
      update: { name: d.name, address: d.address, state: d.state, capacity: d.capacity, pic: d.pic, dormitoryNo: d.dormitoryNo },
      create: { ...d, status: 'ACTIVE', createdBy: ADMIN_ID },
    });
  }

  // ── Clients ────────────────────────────────────────────────────────────────
  const clients = [
    {
      id: 'client-apex',
      clientNo: 'COM0001',
      type: 'COMPANY',
      name: 'Apex Construction Sdn Bhd',
      registrationNo: 'RC-20190823',
      contactName: 'Ahmad Faizal',
      contactPhone: '+60123456789',
      contactEmail: 'faizal@apexconstruction.com.my',
      address: 'Lot 12, Jalan Industri 3, Shah Alam, Selangor',
    },
    {
      id: 'client-buildco',
      clientNo: 'COM0002',
      type: 'COMPANY',
      name: 'BuildCo Sdn Bhd',
      registrationNo: 'RC-20150612',
      contactName: 'Lee Chin Wai',
      contactPhone: '+60197654321',
      contactEmail: 'chinwai@buildco.com.my',
      address: 'No. 5, Jalan PJU 1A/41B, Petaling Jaya, Selangor',
    },
    {
      id: 'client-david',
      clientNo: 'IND0001',
      type: 'INDIVIDUAL',
      name: 'Mr. David Lim',
      registrationNo: null,
      contactName: 'David Lim',
      contactPhone: '+60112223344',
      contactEmail: 'davidlim88@gmail.com',
      address: null,
    },
  ];
  for (const c of clients) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {
        clientNo: c.clientNo, name: c.name,
        registrationNo: c.registrationNo, contactName: c.contactName,
        contactPhone: c.contactPhone, contactEmail: c.contactEmail, address: c.address,
      },
      create: { id: c.id, clientNo: c.clientNo, type: c.type, name: c.name, status: 'ACTIVE', createdBy: ADMIN_ID, registrationNo: c.registrationNo, contactName: c.contactName, contactPhone: c.contactPhone, contactEmail: c.contactEmail, address: c.address },
    });
  }

  // ── Expats ─────────────────────────────────────────────────────────────────
  const expats = [
    {
      id: 'expat-mohammed',
      expatNo: 'EXP00001',
      clientId: 'client-apex',
      dormitoryId: 'dorm-block-a',
      fullName: 'Mohammed Al-Rashid',
      passportNo: 'BD1234567',
      nationality: 'Bangladeshi',
      dateOfBirth: '1990-05-15',
      phone: '+8801712345678',
      status: 'ACTIVE',
      permitExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // expiring in 30 days
    },
    {
      id: 'expat-linwei',
      expatNo: 'EXP00002',
      clientId: 'client-apex',
      dormitoryId: 'dorm-block-a',
      fullName: 'Lin Wei',
      passportNo: 'CN9876543',
      nationality: 'Chinese',
      dateOfBirth: '1988-11-22',
      phone: '+8613901234567',
      status: 'ACTIVE',
      permitExpiry: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // expiring in 6 days (critical)
    },
    {
      id: 'expat-nguyen',
      expatNo: 'EXP00003',
      clientId: 'client-david',
      dormitoryId: 'dorm-block-c',
      fullName: 'Nguyen Van An',
      passportNo: 'VN5551234',
      nationality: 'Vietnamese',
      dateOfBirth: '1995-03-08',
      phone: '+84912345678',
      status: 'PENDING',
      permitExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  ];
  for (const e of expats) {
    await prisma.expat.upsert({
      where: { id: e.id },
      update: { expatNo: e.expatNo, fullName: e.fullName, passportNo: e.passportNo, dateOfBirth: e.dateOfBirth, phone: e.phone },
      create: {
        id: e.id,
        expatNo: e.expatNo,
        clientId: e.clientId,
        dormitoryId: e.dormitoryId,
        fullName: e.fullName,
        passportNo: e.passportNo,
        dateOfBirth: e.dateOfBirth,
        phone: e.phone,
        nationality: e.nationality,
        status: e.status,
        permitExpiry: e.permitExpiry,
        createdBy: ADMIN_ID,
      },
    });
  }

  // ── Checklist templates ────────────────────────────────────────────────────
  const templates = [
    {
      id: 'tmpl-expat-onboarding',
      name: 'Expat Onboarding',
      entityType: 'EXPAT',
      scope: 'GLOBAL',
      description: 'Standard onboarding checklist for new expat workers',
      items: [
        'Passport and travel documents verified',
        'Work permit application submitted',
        'Medical check-up completed',
        'Dormitory room assigned and key issued',
        'Orientation briefing conducted',
        'Emergency contact details recorded',
        'Safety induction completed',
        'Levy payment confirmed',
      ],
    },
    {
      id: 'tmpl-company-onboarding',
      name: 'Company Client Onboarding',
      entityType: 'CLIENT',
      scope: 'GLOBAL',
      description: 'Onboarding checklist for new company clients',
      items: [
        'Company registration documents verified',
        'Service agreement signed',
        'Billing details confirmed',
        'Primary contact details recorded',
        'Dormitory allocation agreed',
      ],
    },
    {
      id: 'tmpl-individual-onboarding',
      name: 'Individual Client Onboarding',
      entityType: 'CLIENT',
      scope: 'GLOBAL',
      description: 'Onboarding checklist for individual clients',
      items: [
        'Identity documents verified',
        'Service agreement signed',
        'Billing details confirmed',
        'Contact details recorded',
      ],
    },
    {
      id: 'tmpl-dorm-onboarding',
      name: 'Dormitory Onboarding',
      entityType: 'DORMITORY',
      scope: 'GLOBAL',
      description: 'Setup checklist for new dormitory',
      items: [
        'Facility inspection completed',
        'Capacity and room allocation confirmed',
        'Safety equipment checked',
        'PIC contact details recorded',
      ],
    },
    {
      id: 'tmpl-visa-renewal',
      name: 'Visa / Permit Renewal',
      entityType: 'EXPAT',
      scope: 'CUSTOM',
      description: 'Checklist for visa or work permit renewal process',
      items: [
        'Renewal application form completed',
        'Supporting documents collected',
        'Medical examination booked',
        'FOMEMA clearance obtained',
        'Payment receipt confirmed',
        'New permit collected and filed',
      ],
    },
    {
      id: 'tmpl-dorm-inspection',
      name: 'Dormitory Inspection',
      entityType: 'DORMITORY',
      scope: 'CUSTOM',
      description: 'Quarterly inspection checklist for dormitories',
      items: [
        'Structural integrity check',
        'Electrical systems inspected',
        'Plumbing checked',
        'Fire safety equipment verified',
        'Common areas cleaned and assessed',
      ],
    },
    {
      id: 'tmpl-contract-extension',
      name: 'Contract Extension',
      entityType: 'CLIENT',
      scope: 'CUSTOM',
      description: 'Client contract extension checklist',
      items: [
        'Review current contract terms',
        'Negotiate updated terms',
        'Legal review completed',
        'New agreement signed',
        'Billing updated',
        'Confirmation sent to client',
        'Records updated in system',
        'Account manager notified',
      ],
    },
  ];

  for (const tmpl of templates) {
    await prisma.checklistTemplate.upsert({
      where: { id: tmpl.id },
      update: { name: tmpl.name, description: tmpl.description },
      create: {
        id: tmpl.id,
        name: tmpl.name,
        entityType: tmpl.entityType,
        scope: tmpl.scope,
        description: tmpl.description,
        isActive: true,
        createdBy: ADMIN_ID,
      },
    });

    // Remove old items and recreate so order is consistent
    await prisma.checklistTemplateItem.deleteMany({ where: { templateId: tmpl.id } });
    await prisma.checklistTemplateItem.createMany({
      data: tmpl.items.map((itemText, i) => ({
        templateId: tmpl.id,
        itemText,
        order: i + 1,
      })),
    });
  }

  // ── Checklist instances ────────────────────────────────────────────────────
  // Remove old ones and recreate so they link to the correct template items
  await prisma.checklistItem.deleteMany({});
  await prisma.checklist.deleteMany({});

  const instances = [
    { entityType: 'EXPAT',     entityId: 'expat-nguyen',   templateId: 'tmpl-expat-onboarding',        name: 'Expat Onboarding' },
    { entityType: 'EXPAT',     entityId: 'expat-mohammed',  templateId: 'tmpl-expat-onboarding',        name: 'Expat Onboarding' },
    { entityType: 'EXPAT',     entityId: 'expat-linwei',    templateId: 'tmpl-expat-onboarding',        name: 'Expat Onboarding' },
    { entityType: 'CLIENT',    entityId: 'client-apex',     templateId: 'tmpl-company-onboarding',      name: 'Company Client Onboarding' },
    { entityType: 'CLIENT',    entityId: 'client-buildco',  templateId: 'tmpl-company-onboarding',      name: 'Company Client Onboarding' },
    { entityType: 'CLIENT',    entityId: 'client-david',    templateId: 'tmpl-individual-onboarding',   name: 'Individual Client Onboarding' },
    { entityType: 'DORMITORY', entityId: 'dorm-block-a',    templateId: 'tmpl-dorm-onboarding',         name: 'Dormitory Onboarding' },
    { entityType: 'DORMITORY', entityId: 'dorm-block-b',    templateId: 'tmpl-dorm-onboarding',         name: 'Dormitory Onboarding' },
    { entityType: 'DORMITORY', entityId: 'dorm-block-c',    templateId: 'tmpl-dorm-onboarding',         name: 'Dormitory Onboarding' },
  ];

  for (const inst of instances) {
    const tmplItems = await prisma.checklistTemplateItem.findMany({
      where: { templateId: inst.templateId, deletedAt: null },
      orderBy: { order: 'asc' },
    });

    const cl = await prisma.checklist.create({
      data: {
        templateId: inst.templateId,
        entityType: inst.entityType,
        entityId: inst.entityId,
        name: inst.name,
        scope: 'GLOBAL',
        status: 'IN_PROGRESS',
        createdBy: ADMIN_ID,
      },
    });

    if (tmplItems.length > 0) {
      await prisma.checklistItem.createMany({
        data: tmplItems.map(item => ({
          checklistId: cl.id,
          itemText: item.itemText,
          order: item.order,
          status: 'PENDING',
        })),
      });
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
