const BASE_URL = 'http://localhost:3000';

async function testSecurityHeaders() {
  console.log('\n--- 1. Testing Security Headers ---');
  const res = await fetch(`${BASE_URL}/`);
  const headers = res.headers;

  const expectedHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
    'permissions-policy',
    'content-security-policy'
  ];

  for (const h of expectedHeaders) {
    console.log(`${h}: ${headers.get(h) ? '✅ PRESENT (' + headers.get(h) + ')' : '❌ MISSING'}`);
  }
}

async function testZodValidation() {
  console.log('\n--- 2. Testing Zod Input Validation (Login) ---');
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'notanemail', password: '12' })
  });
  const elapsed = Date.now() - start;

  console.log(`Status code: ${res.status} (Expected: 422)`);
  const body = await res.json();
  console.log('Response body:', JSON.stringify(body, null, 2));
  console.log(`Response time: ${elapsed}ms (Expected >= 800ms due to timing attack mitigation)`);
}

async function testTimingAttackMitigation() {
  console.log('\n--- 3. Testing Timing Attack Mitigation (Incorrect login) ---');
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@empresa.com', password: 'wrongpassword123' })
  });
  const elapsed = Date.now() - start;

  console.log(`Status code: ${res.status} (Expected: 401)`);
  const body = await res.json();
  console.log('Response body:', JSON.stringify(body));
  console.log(`Response time: ${elapsed}ms (Expected >= 800ms)`);
}

async function testSuccessfulLoginAndLogout() {
  console.log('\n--- 4. Testing Successful Login, Token Verification and Logout ---');
  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@empresa.com', password: 'admin123' })
  });

  console.log(`Login status code: ${loginRes.status} (Expected: 200)`);
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Cookie header returned:', cookie ? '✅ YES' : '❌ NO');

  if (!cookie) return;

  // Verify auth using getSession/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': cookie }
  });
  const meBody = await meRes.json();
  console.log('Authenticated user:', JSON.stringify(meBody));

  // Logout to revoke token
  console.log('Logging out to revoke token...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': cookie }
  });
  console.log(`Logout status code: ${logoutRes.status} (Expected: 200)`);

  // Verify token is now blocked/revoked
  console.log('Verifying token status after logout...');
  const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': cookie }
  });
  const meBody2 = await meRes2.json();
  console.log('User status after revocation:', JSON.stringify(meBody2), '(Expected: user is null)');
}

async function testRateLimiting() {
  console.log('\n--- 5. Testing Login Rate Limiting (6 attempts) ---');
  const email = `test_limit_${Date.now()}@empresa.com`;
  for (let i = 1; i <= 6; i++) {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrongpassword' })
    });
    const elapsed = Date.now() - start;
    const body = await res.json();
    console.log(`Attempt ${i} - Status: ${res.status}, Remaining: ${res.headers.get('X-RateLimit-Remaining')}, Time: ${elapsed}ms, Response: ${JSON.stringify(body)}`);
  }
}

async function run() {
  try {
    await testSecurityHeaders();
    await testZodValidation();
    await testTimingAttackMitigation();
    await testSuccessfulLoginAndLogout();
    await testRateLimiting();
  } catch (err) {
    console.error('Error during execution:', err);
  }
}

run();
