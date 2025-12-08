/**
 * Script para inicializar las configuraciones por defecto del sistema
 * Ejecutar con: node scripts/init_configuraciones.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Esquema de Configuración
const configuracionSchema = new mongoose.Schema({
    clave: { type: String, required: true, unique: true },
    valor: { type: mongoose.Schema.Types.Mixed, required: true },
    descripcion: { type: String, required: false },
    actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: false },
    actualizadoEn: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const Configuracion = mongoose.model('Configuracion', configuracionSchema);

async function inicializarConfiguraciones() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.BD_URL);
        console.log('✅ Conectado a MongoDB');

        // Configuraciones por defecto
        const configuracionesDefecto = [
            {
                clave: 'limite_publicaciones_basico',
                valor: 10,
                descripcion: 'Límite de publicaciones para usuarios básicos (tipoUsuario = 2)'
            },
            {
                clave: 'limite_publicaciones_premium',
                valor: 50,
                descripcion: 'Límite de publicaciones para usuarios premium (tipoUsuario = 3)'
            }
        ];

        // Insertar o actualizar configuraciones
        for (const config of configuracionesDefecto) {
            const existe = await Configuracion.findOne({ clave: config.clave });
            
            if (existe) {
                console.log(`⚠️`);
            } else {
                await Configuracion.create(config);
               
            }
        }

        console.log('\n🎉 Inicialización de configuraciones completada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al inicializar configuraciones:', error);
        process.exit(1);
    }
}

// Ejecutar
inicializarConfiguraciones();
