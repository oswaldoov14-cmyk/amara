const BASE_URL = 'http://localhost:3000';

async function testAuditoria() {
  console.log('\n--- 1. Logging in as Admin ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@empresa.com', password: 'admin123' })
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed with status:', loginRes.status, await loginRes.text());
    process.exit(1);
  }

  const cookie = loginRes.headers.get('set-cookie');
  console.log('✅ Logged in successfully.');

  // 1. Fetch current configuration to know before-state
  console.log('\n--- 2. Fetching current system configuration ---');
  const getConfigRes = await fetch(`${BASE_URL}/api/admin/configuracion`, {
    headers: { 'Cookie': cookie }
  });
  const configData = await getConfigRes.json();
  const currentConfig = configData.config;
  console.log('✅ Current config:', JSON.stringify(currentConfig));

  // 2. Perform a configuration update (this should trigger an audit entry)
  console.log('\n--- 3. Updating system configuration (triggering audit event) ---');
  // Toggle the radio tolerance slightly to make a change
  const newRadio = currentConfig.radio_metros === 100 ? 105 : 100;
  
  const updateRes = await fetch(`${BASE_URL}/api/admin/configuracion`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      lat_trabajo: currentConfig.lat_trabajo,
      lng_trabajo: currentConfig.lng_trabajo,
      radio_metros: newRadio,
      horario_entrada: currentConfig.horario_entrada,
      horario_salida: currentConfig.horario_salida,
      tarifa_hora_extra: currentConfig.tarifa_hora_extra
    })
  });

  if (!updateRes.ok) {
    console.error('❌ Update failed:', await updateRes.text());
    process.exit(1);
  }
  console.log('✅ Config updated successfully.');

  // 3. Fetch audit logs and verify the entry exists
  console.log('\n--- 4. Fetching audit logs ---');
  const getLogsRes = await fetch(`${BASE_URL}/api/admin/auditoria?limite=5`, {
    headers: { 'Cookie': cookie }
  });
  
  if (!getLogsRes.ok) {
    console.error('❌ Failed to fetch audit logs:', await getLogsRes.text());
    process.exit(1);
  }
  
  const logsData = await getLogsRes.json();
  console.log('✅ Logs received. Total logs in system:', logsData.paginacion.total);
  
  const latestLog = logsData.logs[0];
  console.log('\n🔍 LATEST AUDIT EVENT:');
  console.log('ID:', latestLog.id);
  console.log('Usuario:', latestLog.usuario_email);
  console.log('Acción:', latestLog.accion);
  console.log('Fecha:', latestLog.creado_en);
  console.log('Detalles:', latestLog.detalles);

  // Validate the entry
  if (latestLog.accion === 'Actualizar configuración') {
    const details = JSON.parse(latestLog.detalles);
    if (details.despues.radio_metros === newRadio) {
      console.log('\n🎉 INTEGRATION TEST PASSED: Audit logs are recorded and fetched successfully!');
    } else {
      console.error('❌ INTEGRATION TEST FAILED: Log details did not match expected values.');
    }
  } else {
    console.error('❌ INTEGRATION TEST FAILED: Latest log action was not "Actualizar configuración".');
  }
}

testAuditoria().catch(console.error);
