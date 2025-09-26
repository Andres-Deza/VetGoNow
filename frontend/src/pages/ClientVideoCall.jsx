// ClientVideoCall.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";

// Initialize socket with auto-connect enabled
const socket = io("http://localhost:5555", { autoConnect: true });

const ClientVideoCall = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  // State management
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

  // Video references
  const userVideoRef = useRef(null);
  const peerVideoRef = useRef(null);

  // Register user and join appointment room on mount
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const userId = currentUser ? currentUser.id : null;

    if (!userId) {
      console.warn('⚠️ No se encontró userId para registrar usuario');
      alert("Usuario no autenticado. Por favor inicia sesión.");
      navigate("/login");
      return;
    }

    socket.emit("register-user", { userId });
    console.log(`👤 Registered user ${userId} on socket ${socket.id}`);

    if (appointmentId && appointmentId !== ":appointmentId") {
      socket.emit("join-room", { actualApptId: appointmentId, userId });
      console.log(`➡️ User joined room: ${appointmentId}`);
    } else {
      console.warn('⚠️ Invalid appointmentId:', appointmentId);
    }
  }, [appointmentId, navigate]);

  // Fetch appointment details and listen for invitations
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const currentUserId = currentUser ? currentUser.id : null;

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("❌ Token no encontrado, el usuario no está autenticado!");
      alert("El usuario no está autenticado. Por favor inicia sesión.");
      navigate("/login");
      return;
    }

    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`/api/appointments/users/${currentUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchedAppointments = res.data.appointments || res.data;
        const onlineAppointments = fetchedAppointments
          .filter((appt) => appt.appointmentType === 'online consultation' && appt.status === 'scheduled')
          .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
        const nextAppointment = onlineAppointments.find(
          (appt) => new Date(appt.appointmentDate) > new Date()
        );

        if (nextAppointment) {
          console.log("📅 Próxima cita en línea:", nextAppointment);
          setAppointment(nextAppointment);
        } else {
          setAppointment(null);
        }
      } catch (err) {
        console.error("❌ Error al obtener las citas:", err);
        alert("No se pudieron cargar las citas.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();

    // Listen for call-invitation and start WebRTC directly
    socket.on('call-invitation', ({ userId, appointmentId: apptId }) => {
      console.log('📨 Received invitation:', { userId, apptId });
      let appointmentId = null; // so it can be reassigned

      // Update the outer appointmentId variable before starting WebRTC
      appointmentId = apptId;
      
      console.log("📨 Updated appointmentId to:", appointmentId);
      
      startWebRTC(appointmentId);
    });


    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      socket.off('call-invitation');
    };
  }, [appointmentId, navigate]);

  // Start WebRTC connection
  const startWebRTC = async (appointmentId) => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = userStream;
        console.log("📹 User video stream set");
      }

      // Use STUN servers for better connectivity
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };
      const peer = new RTCPeerConnection(configuration);
      setPeerConnection(peer);

      userStream.getTracks().forEach((track) => peer.addTrack(track, userStream));

      peer.onicecandidate = (event) => {
        if (event.candidate) {
        console.log('📎 Associated appointment ID:', appointmentId);
          socket.emit("send ice-candidate", event.candidate, appointmentId);
        }
      };


      peer.ontrack = (event) => {
        if (peerVideoRef.current && event.streams[0]) {
          peerVideoRef.current.srcObject = event.streams[0];
          console.log("📹 Vet video stream received and set");
        }
      };

      // Create and send offer
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log('📤 Sending offer:', offer,appointmentId);
      socket.emit("send-offer", { offer, appointmentId});
    } catch (error) {
      console.error("❌ WebRTC error:", error);
      alert("Error al iniciar la videollamada. Por favor asegúrate de que los permisos de cámara y micrófono estén concedidos.");

      showFallbackLocalCamera();

    }
  };
const [hasFallback, setHasFallback] = useState(false);

const showFallbackLocalCamera = async () => {
  try {
    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (peerVideoRef.current) {
      peerVideoRef.current.srcObject = fallbackStream;
    }
    setHasFallback(true);
  } catch (fallbackError) {
    console.error("Fallback camera preview failed:", fallbackError);
  }
};





useEffect(() => {
    if (!peerConnection) {
      console.log("⛔ peerConnection not ready yet.");
      return;
    }
    console.log('peerconnected');
  const pendingCandidates = [];

  const handleCandidate = async (candidate) => {
    console.log('❄️ Received ICE candidate:', candidate);
    if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('❌ Error adding ICE candidate:', err);
      }
    } else {
      console.log('⏳ Queuing ICE candidate');
      pendingCandidates.push(candidate);
    }
  };

  const handleAnswer = async (answer) => {
    console.log('📩 Received answer:', answer);
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift();
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('❌ Error adding queued ICE candidate:', err);
        }
      }
    } catch (err) {
      console.error('❌ Error setting remote description:', err);
    }
  };

  socket.on("receive ice-candidate", handleCandidate);
  socket.on("receive-answer", handleAnswer);

  return () => {
    socket.off("receive ice-candidate", handleCandidate);
    socket.off("receive-answer", handleAnswer);
  };
}, [peerConnection]); // ✅ No 'socket' here



  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col w-2/3 gap-4 p-4">
        <h2 className="text-2xl font-bold mb-2">Consulta por video</h2>
        <div className="flex flex-col gap-4">
          <div className="w-[720px] h-[405px] bg-black rounded-lg overflow-hidden relative">
            <span className="absolute top-2 left-2 bg-white bg-opacity-60 px-2 py-1 text-sm rounded">
              Tú
            </span>
            <video ref={userVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="w-[720px] h-[405px] bg-black rounded-lg overflow-hidden relative">
            <span className="absolute top-2 left-2 bg-white bg-opacity-60 px-2 py-1 text-sm rounded">
              {hasFallback ? 'Tu cámara (Respaldo)' : 'Veterinario'}
            </span>
            <video
              ref={peerVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

        </div>
      </div>
      <div className="w-1/3 bg-white p-6 shadow-lg rounded-lg overflow-y-auto">
        <div className="text-center">
          <h3 className="text-xl font-semibold">Esperando consulta...</h3>
        </div>
      </div>
    </div>
  );
};

export default ClientVideoCall;