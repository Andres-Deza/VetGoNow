import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VetPage from './pages/VetPage';
import AppointmentPage from './pages/AppointmentPage';
import UserDashboard from './pages/UserDashboard';
import VetDashboard from './pages/VetDashboard';
import PetsPage from './pages/PetsPage';
import PetDetails from './pages/PetDetails';
import MyAppointments from './pages/MyAppointments';
import VetAppointments from './pages/VetAppointments';
import OngoingAppointment from './pages/OngoingAppointment';
import PrescriptionDetail from './pages/PrescriptionDetail';
import CompletedAppointmentPage from './pages/CompletedAppointmentPage';
import VetAppHistory from './pages/VetAppHistory';
import ClientAppHistory from './pages/ClientAppHistory';
import ClientPrescriptionForm from './pages/ClientAppComplete';
import VideoCall from './pages/VideoCall';
import ClientVideoCall from './pages/ClientVideoCall';
import PaymentProcessing from './pages/PaymentProcessing';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import Settings from './pages/Settings';
import VetUpdateProfile from './pages/VetUpdateProfile';
import WaitingPage from './pages/WaitingPage';
import VetMapPage from './pages/VetMapPage';


const App = () => {
  return (
    <>
      <Navbar />
      <div className="pt-[64px] text-black">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/vets" element={<VetPage />} />
          <Route path="/appointment/:id" element={<AppointmentPage />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/vet-dashboard" element={<VetDashboard />} />
          <Route path="/mypets" element={<PetsPage />} />
          <Route path="/pet-details" element={<PetDetails />} />
          <Route path="/appointments" element={<MyAppointments />} />
          <Route path="/vet-appointments" element={<VetAppointments />} />
          <Route path="/prescription-form/:appointmentId" element={<OngoingAppointment />} />
          <Route path="/prescription/:appointmentId" element={<PrescriptionDetail />} />
          <Route path="/completed-appointment/:appointmentId" element={<CompletedAppointmentPage />} />
          <Route path="/vet/history" element={<VetAppHistory />} />
          <Route path="/client/history" element={<ClientAppHistory />} />
          <Route path="/client/appointment-form/:appointmentId" element={<ClientPrescriptionForm />} />
          <Route path="/video-call/:appointmentId" element={<VideoCall />} />
          <Route path="/client/video-call/:appointmentId" element={<ClientVideoCall />} />
          <Route path="/payment/process/:id" element={<PaymentProcessing />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failure" element={<PaymentFailure />} />       
          <Route path="/settings" element={<Settings />} />
          <Route path="/vet/update-profile" element={<VetUpdateProfile/>}/>
          <Route path="/waitingpage" element={<WaitingPage/>}/>
          <Route path="/mapa-veterinarios" element={<VetMapPage/>} />
        </Routes>
      </div>
      <Footer />
    </>
  );
};

export default App;
