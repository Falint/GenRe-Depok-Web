import assert from 'node:assert/strict';
import test from 'node:test';
import { registrationSchema, resetSchema, accessInput } from '../features/auth/validation';
import { accountDestination } from '../features/auth/policy';
import {
  canApproveOrConfirm,
  canManageContent,
  canViewAdminFinance,
  isPortalMember,
  isAdmin,
} from '../features/auth/permissions';

test('registration accepts Gmail and matching strong portal passwords only', () => {
  const values = {
    nama_lengkap: 'Nama Uji',
    email: 'uji@gmail.com',
    password: 'strong-fixture-password',
    confirmation: 'strong-fixture-password',
  };
  assert.equal(registrationSchema.safeParse(values).success, true);
  for (const patch of [
    { email: 'uji@example.org' },
    { email: 'uji@gmail.com.attacker.test' },
    { confirmation: 'different' },
    { password: 'short', confirmation: 'short' },
    { level: 'admin' },
  ])
    assert.equal(registrationSchema.safeParse({ ...values, ...patch }).success, false);
  assert.equal(
    resetSchema.safeParse({ password: values.password, confirmation: 'different' }).success,
    false,
  );
});
test('destinations preserve internal links and isolate guests and admin management', () => {
  assert.equal(accountDestination('guest', '/administrasi'), '/publik');
  assert.equal(accountDestination('admin'), '/kelola-akun');
  assert.equal(accountDestination('staff'), '/dashboard');
  assert.equal(accountDestination('staff', '/kelola-akun?x=1'), '/dashboard');
  assert.equal(accountDestination('inti', '/administrasi?tab=surat'), '/administrasi?tab=surat');
  assert.equal(accountDestination('inti', '//attacker.test'), '/dashboard');
});
test('admin has business permissions while guest has no internal authority', () => {
  for (const helper of [canViewAdminFinance, canApproveOrConfirm, isPortalMember, isAdmin]) {
    assert.equal(helper('admin'), true);
    assert.equal(helper('guest'), false);
  }
  assert.equal(isAdmin('inti'), false);
  assert.equal(canManageContent({ level: 'guest', bidang_id: 'branding' }), false);
  assert.equal(canManageContent({ level: 'admin', bidang_id: null }), true);
});
test('role changes cannot create admins or assign incompatible placements', () => {
  const values = {
    id: '00000000-0000-4000-8000-000000000001',
    expected_version: 0,
    level: 'staff',
    jabatan: 'Staff',
    bidang_id: 'branding',
    divisi_id: 'design',
  };
  assert.equal(accessInput.safeParse(values).success, true);
  for (const patch of [
    { level: 'admin' },
    { level: 'guest' },
    { level: 'inti' },
    { level: 'kabid' },
    { divisi_id: null },
    { expected_version: -1 },
  ])
    assert.equal(accessInput.safeParse({ ...values, ...patch }).success, false);
});
