// scripts/clean-console.js
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const result = await minify(content, {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        keep_fargs: false,
        keep_fnames: false
      },
      mangle: false,
      format: {
        comments: false
      }
    });
    
    if (result.code) {
      fs.writeFileSync(filePath, result.code);
      console.log(`✓ Limpiado: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
  } catch (error) {
    console.warn(`  Fallback a regex para: ${filePath}`, error.message);
    
    // Fallback simple
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Eliminar console.log, console.info, console.debug
      content = content.replace(
        /console\.(log|info|debug|trace)\([^)]*\);?/g, 
        '/* console.$1 removed */'
      );
      
      fs.writeFileSync(filePath, content);
      return true;
    } catch (fallbackError) {
      console.error(`✗ Error crítico: ${filePath}`, fallbackError.message);
      return false;
    }
  }
}

async function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processed += (await processDirectory(filePath)).processed;
    } else if (file.endsWith('.js') && !file.includes('node_modules')) {
      if (await cleanFile(filePath)) processed++;
    }
  }
  
  return { processed };
}

// Script principal
async function main() {
  console.log(' Iniciando limpieza de console.log...');
  
  const distDir = path.join(__dirname, '../dist');
  
  if (!fs.existsSync(distDir)) {
    console.error(' Directorio dist no encontrado. Ejecuta npm run build primero.');
    process.exit(1);
  }
  
  const result = await processDirectory(distDir);
  console.log(` ${result.processed} archivos procesados`);
  
  // Agregar monkey patch
  addGlobalMonkeyPatch();
}

function addGlobalMonkeyPatch() {
  const indexFile = path.join(__dirname, '../dist/index.js');
  
  if (fs.existsSync(indexFile)) {
    let content = fs.readFileSync(indexFile, 'utf8');
    
    const monkeyPatch = `
// ============================================
// MONKEY PATCH PARA PRODUCCIÓN
// ============================================
if (process.env.NODE_ENV === 'production') {
  const originalConsole = { ...console };
  
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
  
  console.warn = (...args) => {
    const safeArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return arg
          .replace(/(password|token|secret|key|auth)=[^&\\s]+/gi, '$1=***')
          .replace(/["'](password|token|secret|key|auth)["']\\s*:\\s*["'][^"']+["']/gi, '"$1":"***"');
      }
      return arg;
    });
    originalConsole.warn('[WARN]', ...safeArgs);
  };
  
  console.error = (...args) => {
    const safeArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return arg
          .replace(/(password|token|secret|key|auth)=[^&\\s]+/gi, '$1=***')
          .replace(/["'](password|token|secret|key|auth)["']\\s*:\\s*["'][^"']+["']/gi, '"$1":"***"');
      }
      return arg;
    });
    originalConsole.error('[ERROR]', ...safeArgs);
  };
}
// ============================================
`;
    
    content = monkeyPatch + '\n' + content;
    fs.writeFileSync(indexFile, content);
    console.log('✅ Monkey patch agregado a index.js');
  }
}

if (require.main === module) {
  main().catch(console.error);
}