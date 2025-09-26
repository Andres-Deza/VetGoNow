# 🏥 VetGestion - Online Appointment Booking & Consultation Platform

VetGestion is a **full-stack MERN application** for managing veterinary appointments and consultations.  
It provides a secure, role-based system where doctors, pet owners (clients), and admins can interact seamlessly.  
The platform integrates **JWT authentication**, **real-time updates with WebSockets**, and **eSewa payment gateway** for a complete veterinary solution.

---

## 🚀 Features

### 🔑 Authentication & Security

- Secure login & registration with **JWT Authentication**.
- Role-based access: **Admin**, **Doctor**, **Client**.
- Registration approval workflow (admin approves doctors before activation).

### 👨‍⚕️ Doctor Module

- Register account (pending admin approval).
- Add availability and manage bookings.
- Confirm or reject client appointment requests.
- Issue **prescriptions** to clients.
- View complete patient history.

### 🐾 Client (Pet Owner) Module

- Register and create account.
- Add multiple pets under one profile.
- Book appointments with approved doctors.
- Track medical history & prescriptions.
- Secure payments through **eSewa integration**.

### 👨‍💼 Admin Module

- Approve or reject **doctor registrations**.
- Add/remove doctors and clients.
- Monitor all appointments, prescriptions, and consultation history.
- Manage **finance & payment records**.
- Ensure overall system integrity.

### ⚡ Real-Time System

- Live updates for appointment requests and confirmations using **Socket.IO**.
- Notifications for new bookings, confirmations, and payments.

---

## 🛠️ Tech Stack

### Frontend

- **React.js** + Context/Redux for state management
- TailwindCSS / Material UI for UI components
- React Router for navigation

### Backend

- **Node.js + Express.js**
- **JWT Authentication** & Role-based access control
- **Socket.IO** for real-time communication

### Database

- **MongoDB + Mongoose ODM**

### Payment

- **eSewa Payment Gateway Integration**

---

## 💡 Workflow

1. **Doctor Registration**
   - Doctor signs up → Admin reviews → Approval/Rejection.
2. **Client Registration**
   - Client signs up → Can add multiple pets.
3. **Booking**
   - Client books appointment with doctor.
   - Doctor confirms/rejects via dashboard.
4. **Consultation**
   - Doctor provides prescription.
   - History stored for client & admin.
5. **Payments**
   - Client pays via eSewa.
   - Admin monitors finance.

---

## 📌 Roadmap / Future Enhancements

- SMS/Email reminders for upcoming appointments.
- Advanced reporting & analytics dashboard.
- Video consultation integration.

---

## ⚙️ Installation & Setup

```bash
# Clone the repo
git clone https://github.com/nischalmaharzn10/VetGestion.git
cd VetGestion

# Backend setup
cd Backend
npm install
npm run dev

# Frontend setup
cd frontend
npm install
npm run dev

# Admin
cd admin
npm run dev
```
