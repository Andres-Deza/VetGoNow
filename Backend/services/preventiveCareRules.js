/**
 * Motor de reglas para generar calendarios de vacunas y desparasitaciones
 * basado en especie, raza y edad de la mascota
 */

/**
 * Calcula las vacunas recomendadas según la especie y edad
 */
export const calculateRecommendedVaccines = (species, ageYears, ageMonths, existingVaccines = []) => {
  const totalMonths = (ageYears * 12) + (ageMonths || 0);
  const recommendations = [];

  if (species === 'Perro') {
    // Vacunas para perros - Nomenclatura chilena
    // Primera polivalente (DHPPi o óctuple) - 6-8 semanas
    if (totalMonths < 2) {
      recommendations.push({
        name: 'Primera Óctuple (DHPPi)',
        type: 'Polivalente',
        recommendedDate: new Date(),
        priority: 'high',
        description: 'Primera vacuna óctuple: Moquillo (Distemper), Hepatitis, Parvovirus, Parainfluenza (obligatoria)'
      });
    } else if (totalMonths >= 2 && totalMonths < 3) {
      // Segunda polivalente - 10-12 semanas
      recommendations.push({
        name: 'Segunda Óctuple (DHPPi)',
        type: 'Polivalente',
        recommendedDate: new Date(),
        priority: 'high',
        description: 'Refuerzo de vacuna óctuple: Moquillo, Hepatitis, Parvovirus, Parainfluenza (obligatoria)'
      });
    } else if (totalMonths >= 3 && totalMonths < 4) {
      // Tercera polivalente - 14-16 semanas
      recommendations.push({
        name: 'Tercera Óctuple (DHPPi)',
        type: 'Polivalente',
        recommendedDate: new Date(),
        priority: 'high',
        description: 'Refuerzo final de vacuna óctuple: Moquillo, Hepatitis, Parvovirus, Parainfluenza (obligatoria)'
      });
    }

    // Rabia (Antirrábica) - Obligatoria desde los 3-4 meses, anual
    if (totalMonths >= 3) {
      const lastRabies = existingVaccines
        .filter(v => v.type === 'Rabia')
        .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))[0];

      if (!lastRabies || shouldRevaccinateRabies(lastRabies.applicationDate)) {
        recommendations.push({
          name: 'Antirrábica',
          type: 'Rabia',
          recommendedDate: lastRabies 
            ? new Date(new Date(lastRabies.applicationDate).getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(),
          priority: 'high',
          description: 'Vacuna antirrábica anual (obligatoria por ley en Chile)'
        });
      }
    }

    // Tos de las perreras (Bordetella) - Opcional pero recomendada
    if (totalMonths >= 2) {
      const lastKennelCough = existingVaccines
        .filter(v => v.type === 'Tos de las perreras')
        .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))[0];

      if (!lastKennelCough || shouldRevaccinateKennelCough(lastKennelCough.applicationDate)) {
        recommendations.push({
          name: 'Tos de las Perreras (Bordetella)',
          type: 'Tos de las perreras',
          recommendedDate: lastKennelCough
            ? new Date(new Date(lastKennelCough.applicationDate).getTime() + 180 * 24 * 60 * 60 * 1000) // Cada 6 meses
            : new Date(),
          priority: 'medium',
          description: 'Recomendada si tu perro tiene contacto frecuente con otros perros, visita parques o guarderías'
        });
      }
    }

    // Refuerzo anual de óctuple (después del esquema inicial)
    if (totalMonths >= 12) {
      const lastPolivalent = existingVaccines
        .filter(v => v.type === 'Polivalente')
        .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))[0];

      if (lastPolivalent && shouldRevaccinatePolivalent(lastPolivalent.applicationDate)) {
        recommendations.push({
          name: 'Refuerzo Anual Óctuple (DHPPi)',
          type: 'Polivalente',
          recommendedDate: new Date(new Date(lastPolivalent.applicationDate).getTime() + 365 * 24 * 60 * 60 * 1000),
          priority: 'high',
          description: 'Refuerzo anual de vacuna óctuple para mantener inmunidad'
        });
      }
    }
  } else if (species === 'Gato') {
    // Vacunas para gatos - Nomenclatura chilena
    // Triple felina (Trivalente) - 8-9 semanas
    if (totalMonths < 2) {
      recommendations.push({
        name: 'Primera Triple Felina (Trivalente)',
        type: 'Triple felina',
        recommendedDate: new Date(),
        priority: 'high',
        description: 'Primera vacuna trivalente: Panleucopenia, Calicivirus, Rinotraqueitis (obligatoria)'
      });
    } else if (totalMonths >= 2 && totalMonths < 3) {
      // Segunda triple felina - 12 semanas
      recommendations.push({
        name: 'Segunda Triple Felina (Trivalente)',
        type: 'Triple felina',
        recommendedDate: new Date(),
        priority: 'high',
        description: 'Refuerzo de vacuna trivalente: Panleucopenia, Calicivirus, Rinotraqueitis (obligatoria)'
      });
    }

    // Leucemia felina (FeLV) - Recomendada para gatos con acceso al exterior
    if (totalMonths >= 2) {
      const lastLeukemia = existingVaccines
        .filter(v => v.type === 'Leucemia felina')
        .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))[0];

      if (!lastLeukemia || shouldRevaccinateLeukemia(lastLeukemia.applicationDate)) {
        recommendations.push({
          name: 'Leucemia Felina (FeLV)',
          type: 'Leucemia felina',
          recommendedDate: lastLeukemia
            ? new Date(new Date(lastLeukemia.applicationDate).getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(),
          priority: 'medium',
          description: 'Recomendada especialmente para gatos que salen al exterior o viven con otros gatos'
        });
      }
    }

    // Rabia (Antirrábica) para gatos - Obligatoria desde los 3-4 meses
    if (totalMonths >= 3) {
      const lastRabies = existingVaccines
        .filter(v => v.type === 'Rabia')
        .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))[0];

      if (!lastRabies || shouldRevaccinateRabies(lastRabies.applicationDate)) {
        recommendations.push({
          name: 'Antirrábica',
          type: 'Rabia',
          recommendedDate: lastRabies 
            ? new Date(new Date(lastRabies.applicationDate).getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(),
          priority: 'high',
          description: 'Vacuna antirrábica anual (obligatoria por ley en Chile)'
        });
      }
    }

    // Refuerzo anual de triple felina
    if (totalMonths >= 12) {
      const lastTrivalent = existingVaccines
        .filter(v => v.type === 'Triple felina')
        .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))[0];

      if (lastTrivalent && shouldRevaccinatePolivalent(lastTrivalent.applicationDate)) {
        recommendations.push({
          name: 'Refuerzo Anual Triple Felina',
          type: 'Triple felina',
          recommendedDate: new Date(new Date(lastTrivalent.applicationDate).getTime() + 365 * 24 * 60 * 60 * 1000),
          priority: 'high',
          description: 'Refuerzo anual de vacuna trivalente para mantener inmunidad'
        });
      }
    }
  }

  return recommendations.sort((a, b) => a.recommendedDate - b.recommendedDate);
};

/**
 * Verifica si se debe revacunar contra la rabia (anualmente)
 */
const shouldRevaccinateRabies = (lastApplicationDate) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return new Date(lastApplicationDate) < oneYearAgo;
};

/**
 * Verifica si se debe revacunar contra la tos de las perreras (cada 6 meses)
 */
const shouldRevaccinateKennelCough = (lastApplicationDate) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(lastApplicationDate) < sixMonthsAgo;
};

/**
 * Verifica si se debe revacunar la polivalente/triple felina (anualmente)
 */
const shouldRevaccinatePolivalent = (lastApplicationDate) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return new Date(lastApplicationDate) < oneYearAgo;
};

/**
 * Verifica si se debe revacunar contra la leucemia felina (anualmente)
 */
const shouldRevaccinateLeukemia = (lastApplicationDate) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return new Date(lastApplicationDate) < oneYearAgo;
};

/**
 * Calcula la próxima fecha de desparasitación recomendada
 */
export const calculateNextDewormingDate = (species, lastDewormingDate, dewormingType = 'Interna') => {
  const intervals = {
    'Perro': {
      'Interna': 90, // Cada 3 meses
      'Externa': 30, // Cada mes (antipulgas)
      'Combinada': 90
    },
    'Gato': {
      'Interna': 90,
      'Externa': 30,
      'Combinada': 90
    }
  };

  const daysInterval = intervals[species]?.[dewormingType] || 90;
  const nextDate = new Date(lastDewormingDate);
  nextDate.setDate(nextDate.getDate() + daysInterval);

  return nextDate;
};

/**
 * Genera un calendario completo de cuidado preventivo
 */
export const generatePreventiveCareCalendar = (pet, vaccines, dewormings, medicalRecords) => {
  const calendar = [];
  const today = new Date();
  
  // Vacunas pendientes
  const recommendedVaccines = calculateRecommendedVaccines(
    pet.species,
    pet.ageYears || 0,
    pet.ageMonths || 0,
    vaccines
  );

  // Desparasitaciones pendientes - calcular todas las fechas futuras
  const lastDeworming = dewormings
    .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))[0];

  // Intervalos de desparasitación por especie
  const intervals = {
    'Perro': {
      'Interna': 90,
      'Externa': 30,
      'Combinada': 90
    },
    'Gato': {
      'Interna': 90,
      'Externa': 30,
      'Combinada': 90
    }
  };

  // Calcular fechas de desparasitación para los próximos 12 meses
  const dewormingDates = [];
  let currentDewormingDate = lastDeworming 
    ? calculateNextDewormingDate(pet.species, lastDeworming.applicationDate, lastDeworming.type)
    : new Date(); // Si no hay desparasitación previa, recomendar ahora
  
  // Asegurar que la primera fecha no sea en el pasado
  const dewormingInterval = intervals[pet.species]?.[lastDeworming?.type || 'Interna'] || 90;
  if (currentDewormingDate < today) {
    currentDewormingDate = new Date(today);
    currentDewormingDate.setDate(currentDewormingDate.getDate() + dewormingInterval);
  }

  // Generar fechas de desparasitación para los próximos 12 meses
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 12);
  
  while (currentDewormingDate <= maxDate) {
    dewormingDates.push(new Date(currentDewormingDate));
    currentDewormingDate = new Date(currentDewormingDate);
    currentDewormingDate.setDate(currentDewormingDate.getDate() + dewormingInterval);
  }

  // Generar calendario para los próximos 12 meses
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(today);
    monthDate.setMonth(monthDate.getMonth() + i);
    const monthName = monthDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

    const monthTasks = [];

    // Vacunas en este mes
    recommendedVaccines.forEach(vaccine => {
      const vaccineMonth = new Date(vaccine.recommendedDate).getMonth();
      const vaccineYear = new Date(vaccine.recommendedDate).getFullYear();
      
      if (vaccineMonth === monthDate.getMonth() && vaccineYear === monthDate.getFullYear()) {
        monthTasks.push({
          type: 'vaccine',
          title: `Vacuna: ${vaccine.name}`,
          description: vaccine.description,
          priority: vaccine.priority,
          date: vaccine.recommendedDate
        });
      }
    });

    // Desparasitaciones en este mes
    dewormingDates.forEach(dewormingDate => {
      const dewormingMonth = dewormingDate.getMonth();
      const dewormingYear = dewormingDate.getFullYear();
      
      if (dewormingMonth === monthDate.getMonth() && dewormingYear === monthDate.getFullYear()) {
        monthTasks.push({
          type: 'deworming',
          title: 'Desparasitación',
          description: 'Desparasitación interna y/o externa según recomendación',
          priority: 'high',
          date: dewormingDate
        });
      }
    });

    // Control de peso (cada 3 meses)
    if (i % 3 === 0) {
      monthTasks.push({
        type: 'weight_check',
        title: 'Control de peso',
        description: 'Revisar y registrar el peso de la mascota',
        priority: 'medium',
        date: monthDate
      });
    }

    if (monthTasks.length > 0) {
      calendar.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        monthNumber: monthDate.getMonth() + 1,
        year: monthDate.getFullYear(),
        tasks: monthTasks
      });
    }
  }

  return calendar;
};

/**
 * Calcula el peso ideal para una mascota según especie, raza y edad
 */
export const calculateIdealWeight = (species, breed, ageYears, currentWeight) => {
  // Esto es una aproximación general. En producción, sería mejor tener una base de datos
  // con pesos ideales por raza específica.
  
  const weightRanges = {
    'Perro': {
      'Chihuahua': { min: 1.5, max: 3 },
      'Yorkshire': { min: 2, max: 3.5 },
      'Bulldog': { min: 18, max: 25 },
      'Labrador': { min: 25, max: 35 },
      'Golden Retriever': { min: 25, max: 35 },
      'Pastor Alemán': { min: 30, max: 40 },
      'Mestizo': { min: 5, max: 25 }, // Rango amplio para mestizos
      'Mestiza': { min: 5, max: 25 },
      'default': { min: 5, max: 30 }
    },
    'Gato': {
      'Siamés': { min: 3.5, max: 5.5 },
      'Persa': { min: 3.5, max: 7 },
      'Mestizo': { min: 3, max: 6 },
      'Mestiza': { min: 3, max: 6 },
      'default': { min: 3, max: 6 }
    }
  };

  const range = weightRanges[species]?.[breed] || weightRanges[species]?.default || { min: 3, max: 10 };
  
  const idealWeight = (range.min + range.max) / 2;
  const weightStatus = currentWeight 
    ? (currentWeight < range.min ? 'bajo' : currentWeight > range.max ? 'sobrepeso' : 'normal')
    : 'unknown';

  return {
    idealWeight,
    minWeight: range.min,
    maxWeight: range.max,
    weightStatus,
    currentWeight: currentWeight || null
  };
};

