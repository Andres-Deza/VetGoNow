import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from './models/User.js';
import Vet from './models/Veterinarian.js';
import Admin from './models/Admin.js';
import Pet from './models/Pet.js';
import Appointment from './models/Appointment.js';
import Conversation from './models/Conversation.js';
import PricingConfig from './models/PricingConfig.js';
import Vaccine from './models/Vaccine.js';
import Deworming from './models/Deworming.js';
import MedicalRecord from './models/MedicalRecord.js';

dotenv.config();

const mongoDBURL = process.env.mongoDBURL;

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const calculateRutDV = (rutNumber) => {
  let sum = 0;
  let multiplier = 2;
  for (let i = rutNumber.length - 1; i >= 0; i -= 1) {
    sum += parseInt(rutNumber[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
};

const buildDemoRut = (baseNumber) => {
  const numeric = baseNumber.toString();
  const dv = calculateRutDV(numeric);
  return `${numeric}-${dv}`;
};

const resetCollections = async () => {
  await Promise.all([
    User.deleteMany(),
    Vet.deleteMany(),
    Admin.deleteMany(),
    Pet.deleteMany(),
    Appointment.deleteMany(),
    Conversation.deleteMany()
  ]);

    const { default: Prescription } = await import('./models/Prescription.js');
    const { default: Invitation } = await import('./models/Invitation.js');
    const { default: WebpayTransaction } = await import('./models/WebpayTransaction.js');
    await Promise.all([
      Prescription.deleteMany(),
      Invitation.deleteMany(),
      WebpayTransaction.deleteMany(),
      PricingConfig.deleteMany(),
      Vaccine.deleteMany(),
      Deworming.deleteMany(),
      MedicalRecord.deleteMany()
    ]);
};

async function seed() {
  try {
    await mongoose.connect(mongoDBURL);
    console.log('✅ Conectado a MongoDB');

    await resetCollections();

    const admin = await Admin.create({
      name: 'Admin Demo',
      email: 'admin.demo@vetnow.com',
      phoneNumber: '900000001',
      password: 'AdminDemo123', // El pre-save hook del modelo Admin hasheará la contraseña
      role: 'admin'
    });
    console.log('👤 Admin creado:', admin.email, '- ID:', admin._id);

    // Crear configuración inicial de precios
    const pricingConfig = await PricingConfig.create({
      emergency: {
        // Veterinarios independientes: solo a domicilio
        independent: {
          home: {
            normalHours: 34000,  // Urgencia a domicilio - Horario normal
            peakHours: 40000     // Urgencia a domicilio - Hora punta
          }
        },
        // Clínicas veterinarias: presencial y a domicilio
        clinic: {
          clinic: {
            normalHours: 31000,  // Urgencia presencial en clínica - Horario normal
            peakHours: 38000     // Urgencia presencial en clínica - Hora punta
          },
          home: {
            normalHours: 50000,  // Urgencia a domicilio - Horario normal
            peakHours: 60000     // Urgencia a domicilio - Hora punta
          }
        },
        peakHoursRange: {
          start: 20,  // 20:00 (8 PM)
          end: 8      // 08:00 (8 AM)
        },
        distanceSurchargePerKm: 0  // Ya no se usa recargo por distancia, está incluido en precio base
      },
      appointments: {
        // Veterinarios independientes
        independent: {
          clinicVisit: 0,           // No aplica para independientes
          homeVisit: 27000,         // Consulta a domicilio
          teleconsultation: 15000   // Teleconsulta
        },
        // Clínicas veterinarias
        clinic: {
          clinicVisit: 25000,       // Consulta en clínica
          homeVisit: 40000,         // Consulta a domicilio
          teleconsultation: 17000  // Teleconsulta
        }
      },
      updatedBy: admin._id
    });
    console.log('💰 Configuración de precios creada');

    // Clínica Veterinaria Demo
    const clinicRut = buildDemoRut(12548765);
    const clinicNationalId = buildDemoRut(98765432);
    const clinicTechnicalResponsibleRut = buildDemoRut(11223344);
    
    // Hashear contraseñas antes de insertar (insertMany no dispara pre-save hooks)
    const vetPassword = await hashPassword('123456');
    
    await Vet.insertMany([
      {
        name: 'Clínica Vet Plaza Demo',
        email: 'vetclinic@vetnow.com',
        phoneNumber: '+56900000010',
        password: vetPassword,
        role: 'Vet',
        specialization: 'Pequeños animales',
        experience: 8,
        qualifications: 'Universidad de Chile',
        region: 'Metropolitana de Santiago',
        comuna: 'Providencia',
        isApproved: true,
        services: ['consultas', 'video-consultas', 'a-domicilio'],
        location: { type: 'Point', coordinates: [-70.6091, -33.4263] },
        supportsEmergency: true,
        supportsInPersonEmergency: true,
        availableNow: false,
        currentStatus: 'offline',
        vetType: 'clinic',
        platformRole: 'CLINICA',
        nationalId: clinicNationalId.replace('-', ''),
        nationalIdDocument: 'https://via.placeholder.com/400x300?text=Documento+Identidad',
        frontIdImage: 'https://via.placeholder.com/400x300?text=Cedula+Frontal',
        backIdImage: 'https://via.placeholder.com/400x300?text=Cedula+Reverso',
        certificate: 'https://via.placeholder.com/400x300?text=Certificado+Veterinario',
        profileImage: 'https://ui-avatars.com/api/?name=Clinica+Vet+Plaza&background=0EA5E9&color=FFFFFF',
        verificationStatus: 'verified',
        // Datos de clínica
        clinicRut: clinicRut.replace('-', ''),
        legalName: 'Clínica Veterinaria Plaza SpA',
        tradeName: 'Clínica Vet Plaza Demo',
        clinicPhone: '+56223456789',
        clinicMobile: '+56900000010',
        clinicEmail: 'vetclinic@vetnow.com',
        website: 'https://www.vetplaza.cl',
        socialMedia: {
          instagram: '@vetplaza',
          facebook: 'Clínica Vet Plaza',
          other: ''
        },
        clinicAddress: {
          street: 'Av. Providencia',
          number: '1234',
          commune: 'Providencia',
          region: 'Región Metropolitana de Santiago',
          reference: 'Av. Providencia 1234, Providencia, Región Metropolitana de Santiago'
        },
        technicalResponsible: {
          name: 'Dr. Carlos Méndez',
          rut: clinicTechnicalResponsibleRut.replace('-', ''),
          email: 'carlos.mendez@vetplaza.cl',
          phone: '+56987654321'
        },
        userRole: 'representante_legal',
        inPersonServices: ['consulta', 'cirugia', 'hospitalizacion'],
        additionalModalities: ['domicilio', 'teleconsulta'],
        openingHours: [
          { day: 1, open: '09:00', close: '20:00', open24h: false },
          { day: 2, open: '09:00', close: '20:00', open24h: false },
          { day: 3, open: '09:00', close: '20:00', open24h: false },
          { day: 4, open: '09:00', close: '20:00', open24h: false },
          { day: 5, open: '09:00', close: '20:00', open24h: false },
          { day: 6, open: '10:00', close: '18:00', open24h: false }
        ],
        alwaysOpen24h: false,
        municipalLicenseDocument: 'https://via.placeholder.com/400x300?text=Patente+Municipal',
        technicalResponsibleTitleDocument: 'https://via.placeholder.com/400x300?text=Titulo+Responsable+Tecnico',
        declarations: {
          acceptedTerms: true,
          acceptedPrivacy: true,
          informationIsTruthful: true,
          hasAuthorization: true
        },
        ratings: {
          average: 4.8,
          total: 12,
          showAverage: true,
          breakdown: {
            punctuality: 4.9,
            professionalism: 4.8,
            communication: 4.7,
            care: 4.9
          }
        }
      },
      // Veterinario Independiente Demo
      {
        name: 'Dra. Emilia Fuentes',
        email: 'vetind@vetnow.com',
        phoneNumber: '+56900000011',
        password: vetPassword,
        role: 'Vet',
        specialization: 'Medicina General',
        experience: 6,
        qualifications: 'Universidad Mayor',
        region: 'Metropolitana de Santiago',
        comuna: 'Ñuñoa',
        isApproved: true,
        services: ['video-consultas', 'a-domicilio'],
        location: { type: 'Point', coordinates: [-70.5946, -33.4569] },
        supportsEmergency: true,
        availableNow: false,
        currentStatus: 'offline',
        vetType: 'independent',
        platformRole: 'VET_INDEPENDIENTE',
        nationalId: buildDemoRut(14321876).replace('-', ''),
        nationalIdDocument: 'https://via.placeholder.com/400x300?text=Documento+Identidad',
        frontIdImage: 'https://via.placeholder.com/400x300?text=Cedula+Frontal',
        backIdImage: 'https://via.placeholder.com/400x300?text=Cedula+Reverso',
        certificate: 'https://via.placeholder.com/400x300?text=Certificado+Veterinario',
        profileImage: 'https://ui-avatars.com/api/?name=Emilia+Fuentes&background=0EA5E9&color=FFFFFF',
        verificationStatus: 'verified',
        // Datos de veterinario independiente
        professionalName: 'Dra. Emilia Fuentes',
        professionalRut: buildDemoRut(14321876).replace('-', ''),
        contactPhone: '+56900000011',
        contactEmail: 'vetind@vetnow.com',
        serviceModalities: ['domicilio', 'teleconsulta'],
        coverageCommunes: ['Ñuñoa', 'Providencia', 'Las Condes', 'La Reina'],
        coverageRadius: 15,
        specialties: ['Felinos', 'Medicina General', 'Cirugía Menor'],
        profileDescription: 'Veterinaria con más de 6 años de experiencia en atención a pequeños animales. Especializada en medicina felina y atención a domicilio. Comprometida con el bienestar animal y la atención personalizada.',
        siiActivityStartDocument: 'https://via.placeholder.com/400x300?text=Inicio+Actividades+SII',
        declarations: {
          acceptedTerms: true,
          acceptedPrivacy: true,
          informationIsTruthful: true
        },
        ratings: {
          average: 4.9,
          total: 8,
          showAverage: true,
          breakdown: {
            punctuality: 5.0,
            professionalism: 4.9,
            communication: 4.8,
            care: 5.0
          }
        }
      }
    ]);

    const users = await User.insertMany([
      {
        name: 'Valentina Rojas',
        email: 'user1@vetnow.com',
        phoneNumber: '+56933333331',
        password: vetPassword,
        role: 'User',
        isApproved: true,
        image: 'https://ui-avatars.com/api/?name=Valentina+Rojas&background=6366F1&color=FFFFFF',
        stripeCustomerId: null
      },
      {
        name: 'Mauricio Herrera',
        email: 'user2@vetnow.com',
        phoneNumber: '+56944444442',
        password: vetPassword,
        role: 'User',
        isApproved: true,
        image: 'https://ui-avatars.com/api/?name=Mauricio+Herrera&background=6366F1&color=FFFFFF',
        stripeCustomerId: null
      }
    ]);

    const userByEmail = Object.fromEntries(users.map((doc) => [doc.email, doc]));

    // Verificar que los usuarios se crearon correctamente
    console.log('👥 Usuarios creados:');
    users.forEach(user => {
      console.log(`  - ${user.email}: ${user._id}`);
    });

    // Calcular edad para las mascotas
    const calculateAge = (birthDate) => {
      const today = new Date();
      const birth = new Date(birthDate);
      let years = today.getFullYear() - birth.getFullYear();
      let months = today.getMonth() - birth.getMonth();
      
      if (months < 0) {
        years--;
        months += 12;
      }
      
      if (today.getDate() < birth.getDate()) {
        months--;
        if (months < 0) {
          years--;
          months += 12;
        }
      }
      
      return { years, months };
    };

    const kiraBirthDate = new Date('2020-05-10');
    const lunaBirthDate = new Date('2021-08-22');
    const rockyBirthDate = new Date('2018-03-15');
    
    const kiraAge = calculateAge(kiraBirthDate);
    const lunaAge = calculateAge(lunaBirthDate);
    const rockyAge = calculateAge(rockyBirthDate);

    // Verificar que los userId existen antes de crear las mascotas
    const user1Id = userByEmail['user1@vetnow.com']?._id;
    const user2Id = userByEmail['user2@vetnow.com']?._id;

    if (!user1Id || !user2Id) {
      console.error('❌ Error: No se encontraron los usuarios necesarios');
      throw new Error('Usuarios no encontrados para asociar mascotas');
    }

    console.log('🐾 Creando mascotas...');
    console.log(`  - Kira para usuario: ${user1Id}`);
    console.log(`  - Luna para usuario: ${user2Id}`);
    console.log(`  - Rocky para usuario: ${user2Id}`);

    const pets = await Pet.insertMany([
      {
        userId: user1Id,
        name: 'Kira',
        species: 'Perro',
        breed: 'Mestiza',
        gender: 'Hembra',
        color: 'Canela',
        description: 'Perra sociable y juguetona',
        birthDate: kiraBirthDate,
        ageYears: kiraAge.years,
        ageMonths: kiraAge.months,
        weight: 16,
        image: null
      },
      {
        userId: user2Id,
        name: 'Luna',
        species: 'Gato',
        breed: 'Siamés',
        gender: 'Hembra',
        color: 'Crema',
        description: 'Gata curiosa que ama las alturas',
        birthDate: lunaBirthDate,
        ageYears: lunaAge.years,
        ageMonths: lunaAge.months,
        weight: 4.5,
        image: null
      },
      {
        userId: user2Id,
        name: 'Rocky',
        species: 'Perro',
        breed: 'Labrador',
        gender: 'Macho',
        color: 'Dorado',
        description: 'Perro leal ideal para emergencias',
        birthDate: rockyBirthDate,
        ageYears: rockyAge.years,
        ageMonths: rockyAge.months,
        weight: 25,
        image: null
      }
    ]);

    console.log('✅ Mascotas creadas:');
    pets.forEach(pet => {
      console.log(`  - ${pet.name} (${pet._id}) para usuario ${pet.userId}`);
    });

    // Obtener IDs de veterinarios para asociar vacunas y registros médicos
    const clinicVet = await Vet.findOne({ email: 'vetclinic@vetnow.com' });
    const independentVet = await Vet.findOne({ email: 'vetind@vetnow.com' });

    // Crear vacunas para las mascotas
    console.log('💉 Creando vacunas de ejemplo...');
    
    const petKira = pets.find(p => p.name === 'Kira');
    const petRocky = pets.find(p => p.name === 'Rocky');
    const petLuna = pets.find(p => p.name === 'Luna');

    const vaccines = [];
    const dewormings = [];
    const medicalRecords = [];

    if (petKira && clinicVet) {
      // Vacunas para Kira (mestiza, ~4 años)
      const kiraVaccines = [
        {
          petId: petKira._id,
          userId: petKira.userId,
          name: 'Vacuna Antirrábica',
          type: 'Rabia',
          applicationDate: new Date('2023-05-15'),
          expirationDate: new Date('2024-05-15'),
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: new Date('2024-05-15') > new Date(),
          isExpired: new Date('2024-05-15') < new Date()
        },
        {
          petId: petKira._id,
          userId: petKira.userId,
          name: 'Vacuna Polivalente',
          type: 'Polivalente',
          applicationDate: new Date('2023-05-15'),
          expirationDate: new Date('2024-05-15'),
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: true,
          isExpired: false
        }
      ];
      vaccines.push(...kiraVaccines);

      // Desparasitaciones para Kira
      dewormings.push(
        {
          petId: petKira._id,
          userId: petKira.userId,
          name: 'Desparasitante Interno',
          type: 'Interna',
          applicationDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // Hace 45 días
          nextApplicationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // En 45 días
          productName: 'Vermifugo Plus',
          dosage: '1 tableta',
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: true
        }
      );

      // Registro médico para Kira
      medicalRecords.push({
        petId: petKira._id,
        userId: petKira.userId,
        recordType: 'consultation',
        title: 'Consulta de control anual',
        description: 'Revisión general, estado de salud normal',
        date: new Date('2023-05-15'),
        diagnosis: ['Estado de salud normal'],
        vetId: clinicVet._id,
        vetName: clinicVet.name,
        weightAtTime: 16
      });
    }

    if (petRocky && clinicVet) {
      // Vacunas para Rocky (Labrador, ~7 años)
      const rockyVaccines = [
        {
          petId: petRocky._id,
          userId: petRocky.userId,
          name: 'Vacuna Antirrábica',
          type: 'Rabia',
          applicationDate: new Date('2024-01-10'),
          expirationDate: new Date('2025-01-10'),
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: true,
          isExpired: false
        },
        {
          petId: petRocky._id,
          userId: petRocky.userId,
          name: 'Vacuna Polivalente',
          type: 'Polivalente',
          applicationDate: new Date('2024-01-10'),
          expirationDate: new Date('2025-01-10'),
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: true,
          isExpired: false
        },
        {
          petId: petRocky._id,
          userId: petRocky.userId,
          name: 'Tos de las Perreras',
          type: 'Tos de las perreras',
          applicationDate: new Date('2024-01-10'),
          expirationDate: new Date('2025-01-10'),
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: true,
          isExpired: false
        }
      ];
      vaccines.push(...rockyVaccines);

      // Desparasitaciones para Rocky
      dewormings.push(
        {
          petId: petRocky._id,
          userId: petRocky.userId,
          name: 'Desparasitante Combinado',
          type: 'Combinada',
          applicationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
          nextApplicationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // En 60 días
          productName: 'Drontal Plus',
          dosage: '1 tableta',
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: true
        },
        {
          petId: petRocky._id,
          userId: petRocky.userId,
          name: 'Antipulgas y Garrapatas',
          type: 'Externa',
          applicationDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Hace 15 días
          nextApplicationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // En 15 días
          productName: 'Frontline Plus',
          dosage: 'Aplicación tópica',
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          isUpToDate: true
        }
      );

      // Registros médicos para Rocky
      medicalRecords.push(
        {
          petId: petRocky._id,
          userId: petRocky.userId,
          recordType: 'consultation',
          title: 'Consulta de control anual',
          description: 'Control anual completo, vacunación al día',
          date: new Date('2024-01-10'),
          diagnosis: ['Estado de salud normal'],
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          weightAtTime: 25
        },
        {
          petId: petRocky._id,
          userId: petRocky.userId,
          recordType: 'consultation',
          title: 'Control de peso',
          description: 'Control de peso trimestral, peso dentro de rango normal',
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          diagnosis: ['Peso normal'],
          vetId: clinicVet._id,
          vetName: clinicVet.name,
          weightAtTime: 24.5
        }
      );
    }

    if (petLuna && independentVet) {
      // Vacunas para Luna (gata siamesa, ~3 años)
      const lunaVaccines = [
        {
          petId: petLuna._id,
          userId: petLuna.userId,
          name: 'Triple Felina',
          type: 'Triple felina',
          applicationDate: new Date('2024-02-20'),
          expirationDate: new Date('2025-02-20'),
          vetId: independentVet._id,
          vetName: independentVet.name,
          isUpToDate: true,
          isExpired: false
        },
        {
          petId: petLuna._id,
          userId: petLuna.userId,
          name: 'Vacuna Antirrábica',
          type: 'Rabia',
          applicationDate: new Date('2024-02-20'),
          expirationDate: new Date('2025-02-20'),
          vetId: independentVet._id,
          vetName: independentVet.name,
          isUpToDate: true,
          isExpired: false
        },
        {
          petId: petLuna._id,
          userId: petLuna.userId,
          name: 'Leucemia Felina',
          type: 'Leucemia felina',
          applicationDate: new Date('2024-02-20'),
          expirationDate: new Date('2025-02-20'),
          vetId: independentVet._id,
          vetName: independentVet.name,
          isUpToDate: true,
          isExpired: false
        }
      ];
      vaccines.push(...lunaVaccines);

      // Desparasitaciones para Luna
      dewormings.push(
        {
          petId: petLuna._id,
          userId: petLuna.userId,
          name: 'Desparasitante Interno',
          type: 'Interna',
          applicationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Hace 60 días
          nextApplicationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // En 30 días
          productName: 'Milbemax',
          dosage: '1 tableta',
          vetId: independentVet._id,
          vetName: independentVet.name,
          isUpToDate: true
        }
      );

      // Registros médicos para Luna
      medicalRecords.push({
        petId: petLuna._id,
        userId: petLuna.userId,
        recordType: 'consultation',
        title: 'Consulta de control anual',
        description: 'Control anual, gata saludable, vacunación completa',
        date: new Date('2024-02-20'),
        diagnosis: ['Estado de salud normal'],
        vetId: independentVet._id,
        vetName: independentVet.name,
        weightAtTime: 4.5
      });
    }

    // Insertar vacunas, desparasitaciones y registros médicos
    if (vaccines.length > 0) {
      await Vaccine.insertMany(vaccines);
      console.log(`✅ ${vaccines.length} vacunas creadas`);
    }

    if (dewormings.length > 0) {
      await Deworming.insertMany(dewormings);
      console.log(`✅ ${dewormings.length} desparasitaciones creadas`);
    }

    if (medicalRecords.length > 0) {
      await MedicalRecord.insertMany(medicalRecords);
      console.log(`✅ ${medicalRecords.length} registros médicos creados`);
    }

    console.log('🌱 Datos de demostración insertados correctamente');
    console.log('\n📝 Credenciales de usuarios demo:');
    console.log('   Usuario 1: user1@vetnow.com / 123456');
    console.log('   Usuario 2: user2@vetnow.com / 123456');
    console.log('\n⚠️  IMPORTANTE: Si ya habías iniciado sesión, debes cerrar sesión y volver a iniciar sesión');
    console.log('   para que el localStorage tenga el nuevo ID de usuario y puedas ver las mascotas.\n');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

seed();

