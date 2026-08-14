import mongoose from 'mongoose';
import { connectDb, disconnectDb } from './config/db';
import { hashPassword } from './modules/auth/auth.service';
import {
  generateFallbackCode,
  hashFallbackCode,
} from './modules/authorizationLink/qrToken.service';
import { AuthorizationLinkModel } from './modules/authorizationLink/authorizationLink.model';
import { AuthorizedPersonModel } from './modules/authorizedPerson/authorizedPerson.model';
import { GuardianStudentLinkModel } from './modules/guardianStudentLink/guardianStudentLink.model';
import { GuardianModel } from './modules/guardian/guardian.model';
import { OrganizationModel } from './modules/organization/organization.model';
import { SchoolModel } from './modules/school/school.model';
import { StaffModel } from './modules/staff/staff.model';
import { StudentModel } from './modules/student/student.model';

/**
 * Demo seed: wipes the database, then creates one Organization + School,
 * two Staff (admin + guard), three Students, three Guardians (two of them
 * linked to the SAME student), two AuthorizedPeople, and two
 * AuthorizationLinks (one standing, one daily).
 *
 * Run: npm run build && node dist/seed.js
 *
 * Guardians are seeded fully activated (password set directly, no claim
 * token) so every account can log in immediately for manual Postman /
 * Insomnia testing of the full flow:
 *
 *   1. admin  →  POST /staff          (manage gate staff)
 *   2. guard  →  POST /pickup-events/verify (scan the guardian's QR/code)
 *   3. guardian → GET /guardian-student-links/:id/qr  (their pickup digital ID)
 *   4. guardian → POST /authorization-links          (grant standing/daily)
 *
 * DESTRUCTIVE: drops the entire `apea` database. Dev/testing only.
 */
async function main(): Promise<void> {
  await connectDb();
  await mongoose.connection.dropDatabase();
  console.log('dropped database — seeding demo data...\n');

  const organization = await OrganizationModel.create({ name: 'Demo District', plan: 'pro' });

  const school = await SchoolModel.create({
    organizationId: organization._id,
    name: 'Demo Academy',
    address: '12 Unity Road, Ikeja, Lagos',
    contactEmail: 'school@demo.ng',
    contactPhone: '+2347000000000',
  });

  const adminPassword = 'admin1234';
  const guardPassword = 'guard1234';
  const guardianPassword = 'demo1234';

  const admin = await StaffModel.create({
    schoolId: school._id,
    name: 'Mrs. Ajayi (Admin)',
    email: 'admin@demo.ng',
    phone: '+2347011111111',
    role: 'admin',
    passwordHash: await hashPassword(adminPassword),
  });

  const guard = await StaffModel.create({
    schoolId: school._id,
    name: 'Mr. Okafor (Guard)',
    email: 'guard@demo.ng',
    phone: '+2347022222222',
    role: 'guard',
    passwordHash: await hashPassword(guardPassword),
  });

  const [ada, chidi, zainab] = await StudentModel.create([
    { schoolId: school._id, firstName: 'Ada', lastName: 'Adele', classGrade: 'P4' },
    { schoolId: school._id, firstName: 'Chidi', lastName: 'Okoro', classGrade: 'P6' },
    { schoolId: school._id, firstName: 'Zainab', lastName: 'Bello', classGrade: 'KG2' },
  ]);

  // Two guardians for the SAME student (Ada) — mother + father — to demo
  // co-guardianship, plus one guardian for Chidi. Seeded active (no claim).
  const mamaAda = await GuardianModel.create({
    organizationId: organization._id,
    name: 'Mama Ada',
    email: 'mama.ada@demo.ng',
    phone: '+2347033333333',
    status: 'active',
    passwordHash: await hashPassword(guardianPassword),
  });
  const papaAda = await GuardianModel.create({
    organizationId: organization._id,
    name: 'Papa Ada',
    email: 'papa.ada@demo.ng',
    phone: '+2347044444444',
    status: 'active',
    passwordHash: await hashPassword(guardianPassword),
  });
  const mamaChidi = await GuardianModel.create({
    organizationId: organization._id,
    name: 'Mama Chidi',
    email: 'mama.chidi@demo.ng',
    phone: '+2347055555555',
    status: 'active',
    passwordHash: await hashPassword(guardianPassword),
  });

  await GuardianStudentLinkModel.create([
    { guardianId: mamaAda._id, studentId: ada._id, relationship: 'mother', isPrimary: true },
    { guardianId: papaAda._id, studentId: ada._id, relationship: 'father', isPrimary: false },
    { guardianId: mamaChidi._id, studentId: chidi._id, relationship: 'mother', isPrimary: true },
  ]);

  const nannyBola = await AuthorizedPersonModel.create({
    organizationId: organization._id,
    name: 'Nanny Bola',
    phone: '+2347066666666',
  });
  const uncleTunde = await AuthorizedPersonModel.create({
    organizationId: organization._id,
    name: 'Uncle Tunde',
    phone: '+2347077777777',
  });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Standing: Ada ↔ Nanny Bola, granted by Mama Ada.
  const standingCode = generateFallbackCode();
  const standing = await AuthorizationLinkModel.create({
    studentId: ada._id,
    authorizedPersonId: nannyBola._id,
    grantedByGuardianId: mamaAda._id,
    type: 'standing',
    validFrom: now,
    validUntil: null,
    status: 'active',
    qrTokenHash: hashFallbackCode(generateFallbackCode()),
    fallbackCodeHash: hashFallbackCode(standingCode),
  });

  // Daily: Ada ↔ Uncle Tunde, granted by Papa Ada (co-guardian grant).
  const dailyCode = generateFallbackCode();
  const daily = await AuthorizationLinkModel.create({
    studentId: ada._id,
    authorizedPersonId: uncleTunde._id,
    grantedByGuardianId: papaAda._id,
    type: 'daily',
    validFrom: startOfDay,
    validUntil: endOfDay,
    status: 'active',
    qrTokenHash: hashFallbackCode(generateFallbackCode()),
    fallbackCodeHash: hashFallbackCode(dailyCode),
  });

  console.log('Seeded. Use these credentials (all passwords min 8 chars):');
  console.log('=============================================================');
  console.log(`Organization id: ${organization._id.toString()}`);
  console.log(`School id:       ${school._id.toString()}`);
  console.log();
  console.log(`ADMIN   login: ${admin.email}  / ${adminPassword}   (id ${admin._id.toString()})`);
  console.log(`GUARD   login: ${guard.email}  / ${guardPassword}   (id ${guard._id.toString()})`);
  console.log();
  console.log('GUARDIANS (parent of Ada / Chidi):');
  for (const g of [mamaAda, papaAda, mamaChidi]) {
    console.log(`  login: ${g.email} / ${guardianPassword}   (id ${g._id.toString()})`);
  }
  console.log();
  console.log('Quick flow to test in Postman:');
  console.log('  1. POST /auth/staff/login   (admin)          → manage staff, roster');
  console.log('  2. POST /auth/staff/login   (guard)          → gate verification');
  console.log('  3. POST /auth/guardian/login (mama.ada@demo.ng)');
  console.log('     GET  /guardian-student-links/:linkId/qr   → her QR token + fallback code');
  console.log('     POST /pickup-events/verify { token } (guard) → APPROVED with Ada + photo');
  console.log(`  Standing link id: ${standing._id.toString()} (Ada + Nanny Bola, code ${standingCode})`);
  console.log(`  Daily link id:    ${daily._id.toString()} (Ada + Uncle Tunde, code ${dailyCode})`);

  await disconnectDb();
  process.exit(0);
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
