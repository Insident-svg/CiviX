import { connectDB, disconnectDB } from './config/db.js';

import { Department } from './models/Department.js';
import { SLAConfig } from './models/SLAConfig.js';
import { Severity } from './types/index.js';
import { User } from './models/User.js';
import { Officer } from './models/Officer.js';
import bcrypt from 'bcryptjs';
import { env } from './config/env.js';
import { AuditLog } from './models/AuditLog.js';

const departments = [
  {
    name: 'Road Department',
    code: 'pwd',
  },
  {
    name: 'Water Department',
    code: 'water_board',
  },
  {
    name: 'Sanitation Department',
    code: 'sanitation',
  },
  {
    name: 'Electrical Department',
    code: 'electricity_board',
  },
  {
    name: 'Sewerage Department',
    code: 'sewerage',
  },
  {
    name: 'Traffic Department',
    code: 'traffic_police',
  },
  {
    name: 'Public Safety',
    code: 'police',
  },
  {
    name: 'Healthcare Department',
    code: 'health',
  },
  {
    name: 'Other',
    code: 'other',
  },
];

const officerAccounts = [
  { code: 'pwd', name: 'Road Department Officer', email: 'officer.pwd@civix.local', governmentId: 'CIVIX-OFFICER-PWD' },
  { code: 'water_board', name: 'Water Department Officer', email: 'officer.water@civix.local', governmentId: 'CIVIX-OFFICER-WATER' },
  { code: 'sanitation', name: 'Sanitation Department Officer', email: 'officer.sanitation@civix.local', governmentId: 'CIVIX-OFFICER-SANITATION' },
  { code: 'electricity_board', name: 'Electrical Department Officer', email: 'officer.electrical@civix.local', governmentId: 'CIVIX-OFFICER-ELECTRICAL' },
  { code: 'sewerage', name: 'Sewerage Department Officer', email: 'officer.sewerage@civix.local', governmentId: 'CIVIX-OFFICER-SEWERAGE' },
  { code: 'traffic_police', name: 'Traffic Department Officer', email: 'officer.traffic@civix.local', governmentId: 'CIVIX-OFFICER-TRAFFIC' },
  { code: 'police', name: 'Public Safety Officer', email: 'officer.police@civix.local', governmentId: 'CIVIX-OFFICER-POLICE' },
  { code: 'health', name: 'Healthcare Department Officer', email: 'officer.health@civix.local', governmentId: 'CIVIX-OFFICER-HEALTH' },
  { code: 'other', name: 'Other Services Officer', email: 'officer.other@civix.local', governmentId: 'CIVIX-OFFICER-OTHER' },
];

const DEFAULT_OFFICER_PASSWORD = 'CiviX@12345';

const slaConfigs: { severity: Severity; hours: number }[] = [
  {
    severity: 'low',
    hours: 72,
  },
  {
    severity: 'medium',
    hours: 24,
  },
  {
    severity: 'high',
    hours: 12,
  },
  {
    severity: 'critical',
    hours: 4,
  },
];

async function seed() {
  try {
    await connectDB();
    await User.createIndexes();
    await Officer.createIndexes();

    for (const department of departments) {
      await Department.updateOne(
        { code: department.code },
        {
          $set: {
            name: department.name,
            code: department.code,
            active: true,
          },
        },
        { upsert: true },
      );
    }

    const seededDepartments = await Department.find({
      code: {
        $in: departments.map(
          (department) => department.code,
        ),
      },
    });

    for (const department of seededDepartments) {
      for (const sla of slaConfigs) {
        await SLAConfig.updateOne(
          {
            severity: sla.severity,
            departmentId: department._id,
          },
          {
            $set: {
              severity: sla.severity,
              departmentId: department._id,
              hours: sla.hours,
              active: true,
            },
          },
          { upsert: true },
        );
      }
    }

    // Global defaults are fallback rules when no active department-specific rule applies.
    for (const sla of slaConfigs) {
      await SLAConfig.updateOne(
        { severity: sla.severity, departmentId: { $exists: false } },
        { $set: { severity: sla.severity, hours: sla.hours, active: true }, $unset: { departmentId: 1 } },
        { upsert: true },
      );
    }



    for (const account of officerAccounts) {
      const department = seededDepartments.find((d) => d.code === account.code);
      if (!department) continue;

      let officerUser = await User.findOne({ governmentId: account.governmentId });
      if (!officerUser) {
        officerUser = await User.create({
          name: account.name,
          username: account.governmentId.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30),
          email: account.email,
          passwordHash: await bcrypt.hash(DEFAULT_OFFICER_PASSWORD, 12),
          role: 'officer',
          governmentId: account.governmentId,
          emailVerified: true,
          blocked: false,
        });
      } else {
        officerUser.name = account.name;
        officerUser.email = account.email;
        officerUser.role = 'officer';
        officerUser.emailVerified = true;
        officerUser.blocked = false;
        await officerUser.save();
      }

      await Officer.updateOne(
        { userId: officerUser._id },
        {
          $set: { departmentIds: [department._id], active: true, employeeId: account.governmentId },
          $setOnInsert: { userId: officerUser._id },
        },
        { upsert: true },
      );
    }

    console.log(`Seeded ${officerAccounts.length} department officer accounts. Shared development password: ${DEFAULT_OFFICER_PASSWORD}`);

    if (!(await AuditLog.exists({ action: 'SYSTEM_SEEDED' }))) {
      await AuditLog.create({ actorRole: 'system', action: 'SYSTEM_SEEDED', metadata: { departments: seededDepartments.length, officerAccounts: officerAccounts.length } });
    }

    const adminEmail = env.INITIAL_ADMIN_EMAIL.toLowerCase();
    let admin = await User.findOne({ $or: [{ governmentId: env.INITIAL_ADMIN_GOVERNMENT_ID }, { email: adminEmail }] });
    if (!admin) {
      admin = await User.create({
        name: env.INITIAL_ADMIN_NAME,
        username: env.INITIAL_ADMIN_GOVERNMENT_ID.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30),
        email: adminEmail,
        passwordHash: await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, 12),
        role: 'admin',
        governmentId: env.INITIAL_ADMIN_GOVERNMENT_ID,
        emailVerified: true,
        blocked: false,
      });
      console.log(`Created initial admin: ${env.INITIAL_ADMIN_GOVERNMENT_ID}`);
    } else if (admin.role !== 'admin' || admin.governmentId !== env.INITIAL_ADMIN_GOVERNMENT_ID) {
      admin.role = 'admin';
      admin.governmentId = env.INITIAL_ADMIN_GOVERNMENT_ID;
      admin.emailVerified = true;
      await admin.save();
      console.log(`Updated initial admin: ${env.INITIAL_ADMIN_GOVERNMENT_ID}`);
    }

    console.log(
      `Seeded ${seededDepartments.length} departments`,
    );

    console.log(
      `Seeded ${seededDepartments.length * slaConfigs.length + slaConfigs.length} SLA configurations (department-specific and global defaults)`,
    );
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

await seed();