// Script para limpiar referencias a Stripe y Webpay de la base de datos
// Ejecutar: node scripts/cleanup-stripe-webpay.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mongoDBURL } from '../config.js';
import SavedCard from '../models/SavedCard.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

dotenv.config();

const cleanup = async () => {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(mongoDBURL);
    console.log('Conectado a MongoDB');

    const db = mongoose.connection.db;

    // 1. Eliminar tarjetas de Stripe de saved_cards
    console.log('\n1. Limpiando tarjetas de Stripe...');
    const stripeCardsResult = await SavedCard.deleteMany({ provider: 'stripe' });
    console.log(`   Eliminadas ${stripeCardsResult.deletedCount} tarjetas de Stripe`);

    // 2. Actualizar appointments con método de pago webpay a mercadopago
    console.log('\n2. Actualizando appointments con método webpay...');
    const webpayAppointmentsResult = await Appointment.updateMany(
      { 'payment.method': 'webpay' },
      { $set: { 'payment.method': 'mercadopago' } }
    );
    console.log(`   Actualizados ${webpayAppointmentsResult.modifiedCount} appointments`);

    // 3. Eliminar campos stripeCustomerId de usuarios (si existen)
    console.log('\n3. Limpiando campos stripeCustomerId de usuarios...');
    const usersResult = await User.updateMany(
      { stripeCustomerId: { $exists: true } },
      { $unset: { stripeCustomerId: '' } }
    );
    console.log(`   Actualizados ${usersResult.modifiedCount} usuarios`);

    // 4. Eliminar índices de Stripe si existen
    console.log('\n4. Eliminando índices de Stripe...');
    try {
      const savedCardsCollection = db.collection('saved_cards');
      const indexes = await savedCardsCollection.indexes();
      
      for (const index of indexes) {
        if (index.name && (index.name.includes('stripe') || index.name.includes('Stripe'))) {
          try {
            await savedCardsCollection.dropIndex(index.name);
            console.log(`   Eliminado índice: ${index.name}`);
          } catch (err) {
            if (err.code !== 27) { // 27 = IndexNotFound
              console.log(`   Error al eliminar índice ${index.name}:`, err.message);
            }
          }
        }
      }
    } catch (err) {
      console.log('   Error al eliminar índices:', err.message);
    }

    // 5. Eliminar colección de transacciones de Webpay si existe
    console.log('\n5. Verificando colección webpay_transactions...');
    const collections = await db.listCollections().toArray();
    const webpayCollection = collections.find(c => c.name === 'webpay_transactions');
    if (webpayCollection) {
      console.log('   Colección webpay_transactions encontrada (se mantiene para referencia histórica)');
      console.log('   Si deseas eliminarla, hazlo manualmente desde MongoDB');
    }

    console.log('\n✅ Limpieza completada exitosamente');
    console.log('\n📋 Resumen:');
    console.log(`   - Tarjetas de Stripe eliminadas: ${stripeCardsResult.deletedCount}`);
    console.log(`   - Appointments actualizados: ${webpayAppointmentsResult.modifiedCount}`);
    console.log(`   - Usuarios actualizados: ${usersResult.modifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

cleanup();

