// Script de debug para probar el procesamiento paso a paso
console.log('=== DEBUG WHATSAPP TRANSCRIBER ===');

// Test 1: Verificar que el parsing funciona
function testChatParser() {
  console.log('Testing chat parser...');
  
  const sampleChatText = `[12/25/23, 10:30:15 AM] Juan Pérez: Hola, ¿cómo estás?
[12/25/23, 10:31:20 AM] María García: ¡Hola! Todo bien, gracias
[12/25/23, 10:32:05 AM] Juan Pérez: audio omitido
[12/25/23, 10:33:10 AM] María García: imagen omitida`;

  // Simular el parsing
  const lines = sampleChatText.split('\n');
  console.log('Lines found:', lines.length);
  
  lines.forEach((line, index) => {
    console.log(`Line ${index + 1}: ${line}`);
  });
}

// Test 2: Verificar FormData
function testFormData() {
  console.log('Testing FormData...');
  
  const formData = new FormData();
  formData.append('test', 'value');
  
  console.log('FormData created successfully');
  for (let [key, value] of formData.entries()) {
    console.log(key, value);
  }
}

// Test 3: Verificar fetch API
async function testFetchAPI() {
  console.log('Testing fetch API...');
  
  try {
    const response = await fetch('/api/test', {
      method: 'GET',
    });
    console.log('Fetch response status:', response.status);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Ejecutar tests
testChatParser();
testFormData();
testFetchAPI();

console.log('=== DEBUG COMPLETE ===');
