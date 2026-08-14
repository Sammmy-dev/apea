const BASE = 'http://localhost:4000';
let passed = 0, failed = 0;
const check = (label, ok, extra = '') => {
  if (ok) { passed++; console.log(`  PASS ${label} ${extra}`); }
  else { failed++; console.log(`  FAIL ${label} ${extra}`); }
};

async function req(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function main() {
  const stamp = Date.now();
  const adminEmail = `sam${stamp}@greenfield.ng`;

  console.log('== Onboarding ==');
  const onboard = await req('POST', '/organizations', {
    name: 'Greenfield Schools', plan: 'free',
    school: { name: 'Greenfield Primary', address: 'Lagos', contactEmail: 'school@greenfield.ng' },
    admin: { name: 'Samuel', email: adminEmail, phone: '+2348000000000', password: 'secret123' },
  });
  check('onboard 201', onboard.status === 201);
  check('org id present', !!onboard.json?.organization?.id);
  check('school id present', !!onboard.json?.school?.id);
  check('admin role admin', onboard.json?.admin?.role === 'admin');
  check('no passwordHash leaked', onboard.json?.admin?.passwordHash === undefined);

  const bad = await req('POST', '/organizations', { name: 'X', school: { name: 'Y' }, admin: { name: 'A', email: 'a@b.c', phone: '1', password: 'short' } });
  check('short password 400', bad.status === 400);

  console.log('== Staff login ==');
  const login = await req('POST', '/auth/staff/login', { email: adminEmail, password: 'secret123' });
  check('login 200', login.status === 200);
  check('token issued', typeof login.json?.token === 'string' && login.json.token.length > 20);
  check('userType staff', login.json?.user?.userType === 'staff');
  check('role admin', login.json?.user?.role === 'admin');
  check('schoolId present', !!login.json?.user?.schoolId);
  const token = login.json.token;

  const wrongPw = await req('POST', '/auth/staff/login', { email: adminEmail, password: 'nope' });
  check('wrong password 401', wrongPw.status === 401);

  console.log('== Schools CRUD (admin) ==');
  const list = await req('GET', '/schools', null, token);
  check('list 200, 1 school', list.status === 200 && list.json.length === 1 && list.json[0].name === 'Greenfield Primary');
  check('list has org id', list.json[0].organizationId !== undefined);

  const create2 = await req('POST', '/schools', { name: 'Greenfield Secondary', address: 'Ikeja' }, token);
  check('create 201', create2.status === 201 && create2.json.name === 'Greenfield Secondary');
  const school2Id = create2.json._id;

  const get1 = await req('GET', `/schools/${list.json[0]._id}`, null, token);
  check('get 200', get1.status === 200);

  const patch = await req('PATCH', `/schools/${school2Id}`, { contactEmail: 'sec@greenfield.ng' }, token);
  check('patch 200 + field set', patch.status === 200 && patch.json.contactEmail === 'sec@greenfield.ng');

  const del = await req('DELETE', `/schools/${school2Id}`, null, token);
  check('delete 204', del.status === 204);

  const getDeleted = await req('GET', `/schools/${school2Id}`, null, token);
  check('deleted school 404', getDeleted.status === 404);

  const orgIdPatch = await req('PATCH', `/schools/${list.json[0]._id}`, { organizationId: '000000000000000000000000' }, token);
  check('cannot change org via patch (400)', orgIdPatch.status === 400);

  console.log('== Organizations /me ==');
  const me = await req('GET', '/organizations/me', null, token);
  check('me 200', me.status === 200 && me.json.name === 'Greenfield Schools');

  const patchOrg = await req('PATCH', '/organizations/me', { name: 'Greenfield Schools Ltd' }, token);
  check('patch me 200', patchOrg.status === 200 && patchOrg.json.name === 'Greenfield Schools Ltd');

  const patchOrgBad = await req('PATCH', '/organizations/me', { _id: '000000000000000000000000' }, token);
  check('cannot change _id (ignored)', patchOrgBad.status === 400);

  console.log('== Access control ==');
  const noToken = await req('GET', '/schools', null, undefined);
  check('no token 401', noToken.status === 401);

  const jwt = require('jsonwebtoken');
  const { env } = require('../dist/config/env.js');
  const guardToken = jwt.sign({ userId: 'g1', userType: 'staff', role: 'guard', organizationId: '000000000000000000000001', schoolId: '000000000000000000000002' }, env.jwtSecret, { expiresIn: '7d' });
  const guardRes = await req('GET', '/schools', null, guardToken);
  check('guard token 403', guardRes.status === 403);

  const otherOrgAdmin = jwt.sign({ userId: 'g2', userType: 'staff', role: 'admin', organizationId: '000000000000000000000099', schoolId: '000000000000000000000098' }, env.jwtSecret, { expiresIn: '7d' });
  const foreignList = await req('GET', '/schools', null, otherOrgAdmin);
  check('foreign admin sees empty list (scoped)', foreignList.status === 200 && foreignList.json.length === 0);
  const foreignGet = await req('GET', `/schools/${list.json[0]._id}`, null, otherOrgAdmin);
  check('foreign admin cannot read org school (404)', foreignGet.status === 404);

  console.log('== Delete org cascade ==');
  const delOrg = await req('DELETE', '/organizations/me', null, token);
  check('delete org 204', delOrg.status === 204);

  const meAfter = await req('GET', '/organizations/me', null, token);
  check('org gone after delete', meAfter.status === 404);
  const schoolAfter = await req('GET', `/schools/${list.json[0]._id}`, null, token);
  check('school cascaded', schoolAfter.status === 404);
  const loginAfter = await req('POST', '/auth/staff/login', { email: adminEmail, password: 'secret123' });
  check('staff cascaded (login 401)', loginAfter.status === 401);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });