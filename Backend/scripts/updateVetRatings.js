import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vet from '../models/Veterinarian.js';
import Rating from '../models/Rating.js';

dotenv.config();

// Función para actualizar estadísticas de un veterinario
const updateVetRatings = async (vetId) => {
  try {
    const ratings = await Rating.find({ vetId });
    const total = ratings.length;
    
    // Si no hay calificaciones o hay menos de 5, no mostrar promedio
    if (total === 0) {
      await Vet.findByIdAndUpdate(vetId, {
        'ratings.average': 0,
        'ratings.total': 0,
        'ratings.showAverage': false,
        'ratings.breakdown': {
          punctuality: 0,
          professionalism: 0,
          communication: 0,
          care: 0
        }
      });
      return;
    }

    // Solo calcular promedio si hay 5 o más calificaciones
    const showAverage = total >= 5;
    let average = 0;

    if (showAverage) {
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      average = Math.round((sum / total) * 10) / 10;
    }

    // Calcular promedios por categoría (solo si hay 5 o más calificaciones con categorías)
    const categoriesWithValues = ratings.filter(r => r.categories && Object.values(r.categories).some(v => v > 0));
    const breakdown = {
      punctuality: 0,
      professionalism: 0,
      communication: 0,
      care: 0
    };

    if (showAverage && categoriesWithValues.length >= 5) {
      categoriesWithValues.forEach(r => {
        if (r.categories.punctuality) breakdown.punctuality += r.categories.punctuality;
        if (r.categories.professionalism) breakdown.professionalism += r.categories.professionalism;
        if (r.categories.communication) breakdown.communication += r.categories.communication;
        if (r.categories.care) breakdown.care += r.categories.care;
      });

      const count = categoriesWithValues.length;
      if (count > 0) {
        breakdown.punctuality = Math.round((breakdown.punctuality / count) * 10) / 10;
        breakdown.professionalism = Math.round((breakdown.professionalism / count) * 10) / 10;
        breakdown.communication = Math.round((breakdown.communication / count) * 10) / 10;
        breakdown.care = Math.round((breakdown.care / count) * 10) / 10;
      }
    }

    await Vet.findByIdAndUpdate(vetId, {
      'ratings.average': average,
      'ratings.total': total,
      'ratings.showAverage': showAverage,
      'ratings.breakdown': breakdown
    });
  } catch (error) {
    console.error(`Error updating vet ${vetId}:`, error);
  }
};

// Script principal
const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vetgonow');
    console.log('Conectado a MongoDB');

    const vets = await Vet.find({});
    console.log(`Encontrados ${vets.length} veterinarios`);

    for (const vet of vets) {
      await updateVetRatings(vet._id);
      console.log(`Actualizado: ${vet.name} (${vet._id})`);
    }

    console.log('Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración:', error);
    process.exit(1);
  }
};

runMigration();

