import dns from 'node:dns';
import mongoose from 'mongoose';

let isConnected = false;
let dnsConfigured = false;

export async function connectBD(url: string): Promise<void> {
  if (isConnected) return;
  if (!url) throw new Error('❌ MongoDB URI no proporcionada');

  if (!dnsConfigured) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
    dnsConfigured = true;
  }

  try {
    await mongoose.connect(url, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    isConnected = true;
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error);
    throw error;
  }
}