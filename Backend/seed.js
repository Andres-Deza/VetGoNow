import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

import User from './models/User.js';
import Vet from './models/Veterinarian.js';
import Admin from './models/Admin.js';
import Pet from './models/Pet.js';
import Appointment from './models/Appointment.js';

const mongoDBURL = process.env.mongoDBURL;

async function seed() {
  await mongoose.connect(mongoDBURL);
  console.log('✅ Conectado a MongoDB');

  // Limpia las colecciones
  await User.deleteMany();
  await Vet.deleteMany();
  await Admin.deleteMany();
  await Pet.deleteMany();
  await Appointment.deleteMany();
  // Tablas secundarias
  const { default: Prescribe } = await import('./models/Prescription.js');
  const { default: Invitation } = await import('./models/Invitation.js');
  const { default: EsewaTransaction } = await import('./models/EsewaTransaction.js');
  await Prescribe.deleteMany();
  await Invitation.deleteMany();
  await EsewaTransaction.deleteMany();

  // Función para hashear contraseñas
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  };

  // Admins
  const admins = [];
  for (let i = 1; i <= 20; i++) {
    const hashedPassword = await hashPassword(`admin${i}pass`);
    admins.push({
      name: `Administrador ${i}`,
      email: `admin${i}@VetGestion.com`,
      phoneNumber: `91234${1000 + i}`,
      password: hashedPassword,
      role: 'admin',
    });
  }
  const adminDocs = await Admin.insertMany(admins);

  // Veterinarios
  const especialidades = ['Pequeños animales', 'Exóticos', 'Cirugía', 'Dermatología', 'Cardiología'];
  const posiblesServicios = ['consultas', 'video-consultas', 'a-domicilio'];
  const vets = [];
  for (let i = 1; i <= 20; i++) {
    const hashedPassword = await hashPassword(`vet${i}pass`);

    // Seleccionar aleatoriamente 1-3 servicios
    const serviciosShuffle = [...posiblesServicios].sort(() => 0.5 - Math.random());
    const cantidad = Math.floor(Math.random() * 3) + 1; // 1 a 3
    const serviciosSeleccionados = serviciosShuffle.slice(0, cantidad);

    // Coordenadas aproximadas dentro de Santiago (bounding box pequeña)
    const baseLat = -33.45; // Santiago centro aprox
    const baseLng = -70.66;
    const lat = baseLat + (Math.random() - 0.5) * 0.12; // +-0.06
    const lng = baseLng + (Math.random() - 0.5) * 0.12; // +-0.06

    vets.push({
      name: `Dr. Veterinario ${i}`,
      email: `vet${i}@VetGestion.com`,
      phoneNumber: `98765${1000 + i}`,
      password: hashedPassword,
      role: 'Vet',
      specialization: especialidades[i % especialidades.length],
      experience: Math.floor(Math.random() * 15) + 1,
      qualifications: `Universidad Nacional, Especialidad en ${especialidades[i % especialidades.length]}`,
      region: 'Metropolitana de Santiago',
      comuna: `Comuna ${i}`,
      certificate: `certificado${i}.pdf`,
      isApproved: true,
      services: serviciosSeleccionados,
      location: { type: 'Point', coordinates: [parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))] }
    });
  }
  const vetDocs = await Vet.insertMany(vets);

  // Usuarios
  const nombres = ['Juan', 'Ana', 'Luis', 'María', 'Pedro', 'Lucía', 'Carlos', 'Sofía', 'Miguel', 'Valentina', 'José', 'Camila', 'Andrés', 'Paula', 'Javier', 'Fernanda', 'Diego', 'Gabriela', 'Ricardo', 'Patricia'];
  const users = [];
  for (let i = 1; i <= 20; i++) {
    const hashedPassword = await hashPassword(`usuario${i}pass`);
    users.push({
      name: `${nombres[i - 1]} Pérez`,
      email: `${nombres[i - 1].toLowerCase()}.${i}@VetGestion.com`,
      phoneNumber: `91122${1000 + i}`,
      password: hashedPassword,
      role: 'User',
      isApproved: true,
    });
  }
  const userDocs = await User.insertMany(users);

  // Mascotas
  const razas = ['Labrador', 'Poodle', 'Bulldog', 'Beagle', 'Chihuahua', 'Pastor Alemán', 'Boxer', 'Dálmata', 'Golden Retriever', 'Shih Tzu'];
  const colores = ['Marrón', 'Negro', 'Blanco', 'Gris', 'Dorado', 'Canela', 'Manchado', 'Tricolor', 'Crema', 'Rojo'];
  const pets = [];
  for (let i = 1; i <= 20; i++) {
    pets.push({
      userId: userDocs[i - 1]._id,
      name: `Mascota ${i}`,
      breed: razas[i % razas.length],
      gender: i % 2 === 0 ? 'Male' : 'Female',
      color: colores[i % colores.length],
      description: `Descripción de la mascota ${i}`,
    });
  }
  const petDocs = await Pet.insertMany(pets);

  // Citas
  const appointments = [];
  for (let i = 1; i <= 20; i++) {
    appointments.push({
      userId: userDocs[i - 1]._id,
      vetId: vetDocs[i - 1]._id,
      petId: petDocs[i - 1]._id,
      appointmentDate: new Date(Date.now() + i * 86400000),
      scheduledTime: `${8 + (i % 10)}:00`,
      isPaid: i % 2 === 0,
      status: ['pending', 'scheduled', 'completed', 'cancelled'][i % 4],
      appointmentType: i % 2 === 0 ? 'online consultation' : 'clinic visit',
    });
  }
  const appointmentDocs = await Appointment.insertMany(appointments);

  // Prescriptions
  const sintomas = ['Fiebre', 'Tos', 'Dolor abdominal', 'Vómitos', 'Letargo', 'Herida', 'Pérdida de apetito', 'Diarrea', 'Cojea', 'Picazón'];
  const medicamentos = ['Amoxicilina', 'Ibuprofeno', 'Paracetamol', 'Antiparasitario', 'Antiinflamatorio', 'Antibiótico', 'Suero', 'Pomada', 'Vacuna', 'Antialérgico'];
  const prescriptions = [];
  for (let i = 1; i <= 20; i++) {
    prescriptions.push({
      appointmentId: appointmentDocs[i - 1]._id,
      petId: petDocs[i - 1]._id,
      userId: userDocs[i - 1]._id,
      vetId: vetDocs[i - 1]._id,
      appointmentDate: appointmentDocs[i - 1].appointmentDate,
      scheduledTime: appointmentDocs[i - 1].scheduledTime,
      prescription: {
        symptoms: sintomas[i % sintomas.length],
        medication: medicamentos[i % medicamentos.length],
        dosage: `${Math.floor(Math.random() * 3) + 1} veces al día`,
        instructions: `Administrar con comida. Revisar en ${7 + i} días.`,
      },
    });
  }
  await Prescribe.insertMany(prescriptions);

  // Invitations
  const invitations = [];
  for (let i = 1; i <= 20; i++) {
    invitations.push({
      appointmentId: appointmentDocs[i - 1]._id,
      userId: userDocs[i - 1]._id,
      vetId: vetDocs[i - 1]._id,
      status: ['pending', 'accepted', 'declined'][i % 3],
      createdAt: new Date(Date.now() - i * 3600000),
    });
  }
  await Invitation.insertMany(invitations);

  // Payments (EsewaTransaction)
  const payments = [];
  for (let i = 1; i <= 20; i++) {
    payments.push({
      appointmentId: appointmentDocs[i - 1]._id,
      pid: `PAY${1000 + i}`,
      status: i % 2 === 0 ? 'Success' : 'Failure',
      amount: 1000 + i * 50,
      raw: { detalle: `Pago de cita ${i}` },
      createdAt: new Date(Date.now() - i * 86400000),
    });
  }
  await EsewaTransaction.insertMany(payments);



  console.log('🌱 Datos de ejemplo insertados correctamente');
  await mongoose.disconnect();
  console.log('🔌 Desconectado de MongoDB');
}

seed();
