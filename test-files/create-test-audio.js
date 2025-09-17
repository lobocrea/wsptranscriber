// Script para crear archivos de audio de prueba simulados
// Estos archivos tendrán los nombres correctos pero contenido mínimo para pruebas

const fs = require('fs');
const path = require('path');

const audioFiles = [
  '00000008-AUDIO-2025-07-28-10-17-40.opus',
  '00000009-AUDIO-2025-07-28-10-18-33.opus',
  '00000010-AUDIO-2025-07-28-10-19-10.opus',
  '00000011-AUDIO-2025-07-28-10-20-06.opus',
  '00000016-AUDIO-2025-07-28-10-25-16.opus',
  '00000017-AUDIO-2025-07-28-10-26-51.opus'
];

const testDir = __dirname;

console.log('Creando archivos de audio de prueba...');

audioFiles.forEach(filename => {
  const filePath = path.join(testDir, filename);
  
  // Crear un archivo pequeño con contenido mínimo
  // En un caso real, estos serían archivos de audio reales
  const dummyContent = Buffer.from('DUMMY_AUDIO_FILE_FOR_TESTING');
  
  fs.writeFileSync(filePath, dummyContent);
  console.log(`✓ Creado: ${filename} (${dummyContent.length} bytes)`);
});

console.log('\n✅ Archivos de prueba creados exitosamente!');
console.log('📝 Nota: Estos son archivos simulados para pruebas.');
console.log('📝 Para transcripción real, necesitas archivos de audio reales.');
