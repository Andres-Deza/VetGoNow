// Script para corregir índices en la colección saved_cards
// Ejecutar: node scripts/fix-saved-cards-indexes.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mongoDBURL } from '../config.js';

dotenv.config();

const fixIndexes = async () => {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(mongoDBURL);
    console.log('Conectado a MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('saved_cards');

    console.log('\n📋 Índices actuales en saved_cards:');
    const indexes = await collection.indexes();
    indexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name}:`, JSON.stringify(idx.key, null, 2));
      if (idx.unique) console.log('   - Unique: true');
      if (idx.sparse) console.log('   - Sparse: true');
    });

    console.log('\n🔍 Buscando índice problemático stripePaymentMethodId_1...');
    
    // Buscar y eliminar el índice problemático si existe
    try {
      await collection.dropIndex('stripePaymentMethodId_1');
      console.log('✅ Índice stripePaymentMethodId_1 eliminado');
    } catch (err) {
      if (err.code === 27 || err.codeName === 'IndexNotFound') {
        console.log('ℹ️  El índice stripePaymentMethodId_1 no existe, continuando...');
      } else {
        throw err;
      }
    }

    // Crear índices sparse para campos de Stripe (solo indexan valores no nulos)
    try {
      await collection.createIndex(
        { stripePaymentMethodId: 1 },
        { 
          sparse: true,
          unique: false,
          name: 'stripePaymentMethodId_sparse'
        }
      );
      console.log('✅ Índice sparse creado para stripePaymentMethodId');
    } catch (err) {
      console.log('⚠️  Error al crear índice sparse:', err.message);
    }

    try {
      await collection.createIndex(
        { stripeCustomerId: 1 },
        { 
          sparse: true,
          unique: false,
          name: 'stripeCustomerId_sparse'
        }
      );
      console.log('✅ Índice sparse creado para stripeCustomerId');
    } catch (err) {
      console.log('⚠️  Error al crear índice sparse:', err.message);
    }

    console.log('\n📋 Índices finales en saved_cards:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name}:`, JSON.stringify(idx.key, null, 2));
      if (idx.unique) console.log('   - Unique: true');
      if (idx.sparse) console.log('   - Sparse: true');
    });

    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixIndexes();

