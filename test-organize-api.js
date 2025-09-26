// Test script para verificar que la API organize-chat nunca devuelve error 500
const testCases = [
  // Caso 1: JSON inválido
  {
    name: "JSON inválido",
    body: "invalid json",
    expectedStatus: 400
  },
  
  // Caso 2: Sin chatData
  {
    name: "Sin chatData",
    body: JSON.stringify({ transcriptions: {} }),
    expectedStatus: 400
  },
  
  // Caso 3: chatData no es array
  {
    name: "chatData no es array",
    body: JSON.stringify({ chatData: "not an array", transcriptions: {} }),
    expectedStatus: 400
  },
  
  // Caso 4: chatData vacío
  {
    name: "chatData vacío",
    body: JSON.stringify({ chatData: [], transcriptions: {} }),
    expectedStatus: 200
  },
  
  // Caso 5: Datos válidos básicos
  {
    name: "Datos válidos básicos",
    body: JSON.stringify({
      chatData: [
        { timestamp: "2024-01-01T10:00:00Z", sender: "Juan", content: "Hola", type: "text" },
        { timestamp: "2024-01-01T10:01:00Z", sender: "María", content: "¿Cómo estás?", type: "text" }
      ],
      transcriptions: {}
    }),
    expectedStatus: 200
  },
  
  // Caso 6: Datos con campos faltantes
  {
    name: "Datos con campos faltantes",
    body: JSON.stringify({
      chatData: [
        { sender: "Juan", content: "Hola" }, // Sin timestamp y type
        { timestamp: "2024-01-01T10:01:00Z", type: "text" }, // Sin sender y content
        {} // Completamente vacío
      ],
      transcriptions: {}
    }),
    expectedStatus: 200
  },
  
  // Caso 7: Datos con transcripciones
  {
    name: "Datos con transcripciones",
    body: JSON.stringify({
      chatData: [
        { timestamp: "2024-01-01T10:00:00Z", sender: "Juan", content: "", type: "audio", mediaFile: "audio1.opus" },
        { timestamp: "2024-01-01T10:01:00Z", sender: "María", content: "Respuesta", type: "text" }
      ],
      transcriptions: {
        "audio1.opus": "Hola, ¿cómo estás?"
      }
    }),
    expectedStatus: 200
  },
  
  // Caso 8: transcriptions no es objeto
  {
    name: "transcriptions no es objeto",
    body: JSON.stringify({
      chatData: [
        { timestamp: "2024-01-01T10:00:00Z", sender: "Juan", content: "Hola", type: "text" }
      ],
      transcriptions: "not an object"
    }),
    expectedStatus: 200
  }
];

async function runTest(testCase) {
  try {
    console.log(`\n🧪 Ejecutando: ${testCase.name}`);
    
    const response = await fetch('http://localhost:3000/api/organize-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: testCase.body
    });
    
    const status = response.status;
    const data = await response.json();
    
    console.log(`   Status: ${status} (esperado: ${testCase.expectedStatus})`);
    
    if (status === testCase.expectedStatus) {
      console.log(`   ✅ PASÓ - Status correcto`);
    } else {
      console.log(`   ❌ FALLÓ - Status incorrecto`);
    }
    
    if (status === 500) {
      console.log(`   🚨 ERROR 500 DETECTADO!`);
      console.log(`   Respuesta:`, data);
    } else if (status === 200) {
      console.log(`   📊 Mensajes procesados: ${data.messages?.length || 0}`);
      console.log(`   📝 Resumen: ${data.summary}`);
      if (data.fallback) {
        console.log(`   🔄 Usó fallback: ${data.fallback}`);
      }
    }
    
    return status !== 500; // Retorna true si NO hay error 500
    
  } catch (error) {
    console.log(`   💥 Error de conexión: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando pruebas de la API organize-chat');
  console.log('🎯 Objetivo: Verificar que NUNCA devuelve error 500');
  
  let passed = 0;
  let failed = 0;
  let has500Error = false;
  
  for (const testCase of testCases) {
    const success = await runTest(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
      if (!success) has500Error = true;
    }
  }
  
  console.log('\n📊 RESULTADOS:');
  console.log(`   ✅ Pruebas pasadas: ${passed}`);
  console.log(`   ❌ Pruebas fallidas: ${failed}`);
  
  if (has500Error) {
    console.log('\n🚨 CRÍTICO: Se detectaron errores 500!');
    process.exit(1);
  } else {
    console.log('\n🎉 ÉXITO: No se detectaron errores 500!');
    console.log('✨ La API está protegida contra errores críticos');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testCases };
