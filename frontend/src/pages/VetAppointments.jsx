import React, { useEffect, useState } from "react";
import axios from "axios";
import VetSidebar from "../components/VetSidebar";
import { useNavigate } from "react-router-dom";

const VetAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  const vet = JSON.parse(localStorage.getItem("user"));
  const vetId = vet?.id;
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!vetId || !token) return;
  
    axios
      .get(`/api/appointments/vets/${vetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(async (res) => {
        const data = res.data.appointments;
  
        const enriched = await fetchAdditionalDetails(data, token);
  
        setAppointments(enriched);
      })
      .catch((err) => {
        console.error("Error fetching appointments:", err);
      });
  }, [vetId, token]);
  

  const fetchAdditionalDetails = async (appointments, token) => {
    const updatedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        try {
          const [vetRes, petRes, userRes] = await Promise.all([
            axios.get(`/api/vets/${appointment.vetId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`/api/appointments/pets/${appointment.petId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`/api/appointments/userinfo/${appointment.userId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          return {
            ...appointment,
            vetName: vetRes.data.name,
            petName: petRes.data.name,
            petImage: petRes.data.image,
            userName: userRes.data.name, // Pet owner name
          };
        } catch (err) {
          console.error(
            `❌ Error fetching vet (${appointment.vetId}) or pet (${appointment.petId} or user(${appointment.userId})) details:`,
            err.message,
          );
          return {
            ...appointment,
            vetName: "Unknown Vet",
            petName: "Unknown Pet",
          };
        }
      }),
    );

    return updatedAppointments;
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(
        `/api/appointments/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === id ? { ...appt, status: newStatus } : appt,
        ),
      );
    } catch (err) {
      console.error("Error updating appointment:", err);
    }
  };

  const allUpcoming = appointments
    .filter(
      (a) =>
        a.status === "scheduled" && new Date(a.appointmentDate) > new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime(),
    );

  const nextAppointment = allUpcoming[0];
  const upcomingAppointments = allUpcoming.slice(1);

  const pendingAppointments = appointments.filter(
    (a) => a.status === "pending",
  );

  const completedAppointments = appointments
    .filter((a) => a.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.appointmentDate).getTime() -
        new Date(a.appointmentDate).getTime(),
    )
    .slice(0, 3);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <VetSidebar />
      <div className="flex flex-1 p-6 space-x-6">
        <div className="flex-1 space-y-6">
          <h1 className="text-3xl font-semibold text-gray-800">
            My Appointments
          </h1>

          {/* Next Appointment */}
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Next Appointment
            </h2>
            {nextAppointment ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <img
                    src={nextAppointment.petImage || "default_pet_image.jpg"}
                    alt="Pet"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <p>
                      <strong>Pet:</strong> {nextAppointment.petName}
                    </p>

                    <p>
                      <strong>Owner:</strong> {nextAppointment.userName}
                    </p>

                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(
                        nextAppointment.appointmentDate,
                      ).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Time:</strong> {nextAppointment.scheduledTime}
                    </p>
                    <p>
                      <strong>Type:</strong>{" "}
                      {nextAppointment.appointmentType === "online consultation"
                        ? "Online Consultation"
                        : "In-person Appointment"}
                    </p>
                  </div>
                </div>

                {nextAppointment.appointmentType === "online consultation" ? (
                  <button
                    onClick={() =>
                      navigate(`/video-call/${nextAppointment._id}`)
                    }
                    className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600"
                  >
                    Start Consultation
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      navigate(`/prescription-form/${nextAppointment._id}`)
                    }
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600"
                  >
                    Start Appointment
                  </button>
                )}
              </div>
            ) : (
              <p className="text-blue-800">No next appointment currently.</p>
            )}
          </div>

          {/* Pending Appointments */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Pending Requests
            </h2>
            {pendingAppointments.length > 0 ? (
              <div className="space-y-4">
                {pendingAppointments.map((a) => (
                  <div
                    key={a._id}
                    className="bg-gray-50 p-4 rounded-lg shadow flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={a.petImage || "default_pet_image.jpg"}
                        alt="Pet"
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold">Pet: {a.petName}</p>
                        <p>Owner: {a.userName || a.userId}</p>

                        <p>
                          Date:{" "}
                          {new Date(a.appointmentDate).toLocaleDateString()}
                        </p>
                        <p>Time: {a.scheduledTime}</p>
                        <p>
                          Type:{" "}
                          {a.appointmentType === "online consultation"
                            ? "Online Consultation"
                            : "In-person Appointment"}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusChange(a._id, "scheduled")}
                        className="text-green-600 hover:text-green-800 text-xl"
                        title="Confirm"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => handleStatusChange(a._id, "cancelled")}
                        className="text-red-600 hover:text-red-800 text-xl"
                        title="Decline"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pending requests currently.</p>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Upcoming Appointments
            </h2>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((a) => (
                  <div
                    key={a._id}
                    className="bg-gray-50 p-4 rounded-lg shadow flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={a.petImage || "default_pet_image.jpg"}
                        alt="Pet"
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold">Pet: {a.petName}</p>
                        <p>Owner: {a.userName}</p>

                        <p>
                          Date:{" "}
                          {new Date(a.appointmentDate).toLocaleDateString()}
                        </p>
                        <p>Time: {a.scheduledTime}</p>
                        <p>
                          Type:{" "}
                          {a.appointmentType === "online consultation"
                            ? "Online Consultation"
                            : "In-person Appointment"}
                        </p>
                      </div>
                    </div>
                    {a.appointmentType === "online consultation" ? (
                      <button
                        onClick={() => navigate(`/video-call/${a._id}`)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600"
                      >
                        Start Consultation
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/prescription-form/${a._id}`)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600"
                      >
                        Start Appointment
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                No upcoming appointments currently.
              </p>
            )}
          </div>
        </div>

        {/* Recent Completed Appointments */}
        <div className="w-1/3">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Recent Completed
            </h2>
            <div className="space-y-4">
              {completedAppointments.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No completed appointments.
                </p>
              ) : (
                <>
                  {completedAppointments.map((a) => (
                    <div
                      key={a._id}
                      onClick={() =>
                        navigate(`/completed-appointment/${a._id}`)
                      }
                      className="bg-gray-50 p-3 rounded-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <img
                            src={a.petImage || "default_pet_image.jpg"}
                            alt="Pet"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {a.petName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(a.appointmentDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Owner: {a.userName}
                          </p>

                          <p className="text-xs text-gray-500">
                            {new Date(a.appointmentDate).toLocaleDateString()}
                          </p>
                          <p>
                            Type:{" "}
                            {a.appointmentType === "online consultation"
                              ? "Online Consultation"
                              : "In-person Appointment"}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full">
                            Completed
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 text-right">
                    <button
                      onClick={() => navigate("/vet/history")}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      See all history &gt;&gt;&gt;
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VetAppointments;
