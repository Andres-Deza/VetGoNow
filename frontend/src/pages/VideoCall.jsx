// VideoCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

// Initialize socket with auto-connect enabled
const socket = io("http://localhost:5555", { autoConnect: true });

export default function VideoCall() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [appt, setAppt] = useState(null);
  const [pres, setPres] = useState({ symptoms: '', medication: '', dosage: '', instructions: '' });
  const [pc, setPc] = useState(null);
  const [started, setStarted] = useState(false);
  
  // Video elements
  const userVid = useRef();
  const peerVid = useRef();
  
  // Load appointment details
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("❌ Token not found, vet is not authenticated!");
          alert("Vet is not authenticated. Please login.");
          navigate("/login");
          return;
        }

        const res = await axios.get(`/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('📄 Loaded appointment:', res.data.appointment);
        setAppt(res.data.appointment);
        if (!res.data.appointment?.vetId?._id) {
          console.error('❌ vetId not found in appointment data');
        }
      } catch (err) {
        console.error('❌ Failed to load appointment:', err);
        alert('Failed to load appointment');
      }
    };
  
    fetchAppointment();
  
    // Cleanup
    return () => {
      socket.off('receive-offer');
      socket.off('receive ice-candidate');
    };
  }, [appointmentId, navigate]);

  // Setup WebRTC after receiving offer
  useEffect(() => {
    socket.on("receive-offer", async ({ offer, apptId }) => {
      console.log('📩 Received offer:', offer);
      if (apptId !== apptId) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        userVid.current.srcObject = stream;
        console.log("📹 Vet video stream set");

        const configuration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        };
        const peer = new RTCPeerConnection(configuration);
        setPc(peer);
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        peer.onicecandidate = ({ candidate }) => {
          if (candidate) {
            console.log('📤 Sending ICE candidate:', candidate,appointmentId);
            socket.emit('send ice-candidate', candidate, appointmentId);
          }
        };

        peer.ontrack = (event) => {
          if (peerVid.current && event.streams[0]) {
            peerVid.current.srcObject = event.streams[0];
            console.log("📹 User video stream received and set");
          }
        };

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        console.log('📤 Sending answer:', answer,appointmentId);
        socket.emit('send-answer', answer, appointmentId);
      } catch (error) {
        console.error("❌ WebRTC error:", error);
        alert("Failed to start video call. Please ensure camera and microphone permissions are granted.");
      }
    });

    socket.on("receive ice-candidate", (candidate) => {
      if (pc) {
        console.log('❄️ Received ICE candidate:', candidate);
        try {
          pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('❌ Error adding ICE candidate:', err);
        }
      }
    });

    return () => {
      socket.off('receive-offer');
      socket.off('receive ice-candidate');
    };
  }, [pc, appointmentId]);

  const invite = () => {
    if (started) {
      console.warn("⚠️ Invite already sent, ignoring.");
      return;
    }

    const userId = appt?.userId?._id;
    const vetId = appt?.vetId?._id;
    const apptId = appointmentId;

    if (!userId || !apptId || !vetId) {
      console.warn("⚠️ Missing userId, vetId, or appointmentId");
      return;
    }

    // Register vet
    socket.emit("register-user", { userId: vetId });

    // Join room and send invitation
    console.log("➡️ Emitting join-room with:", { actualApptId: apptId, userId: vetId });
    socket.emit("join-room", { actualApptId: apptId, userId: vetId });

    console.log("🧑‍⚕️ Vet joined room:", apptId);
    const payload = { userId, appointmentId: apptId };
    console.log("📞 Inviting user to call with payload:", payload);
    socket.emit("invite-call", payload);

    setStarted(true);
  };

  // Finish the appointment
  const finish = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/appointments/${appointmentId}/status`, 
        { status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.put(`/api/appointments/${appointmentId}/prescription`, {
        ...pres,
        petId: appt.petId._id,
        userId: appt.userId._id,
        vetId: appt.vetId._id,
        appointmentDate: appt.appointmentDate,
        scheduledTime: appt.scheduledTime
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('✅ Appointment completed.');
      socket.disconnect();
      navigate('/vet-dashboard');
    } catch (err) {
      console.error('❌ Error completing appointment:', err);
      alert('Error completing appointment.');
    }
  };

  if (!appt) return <p>Loading…</p>;

  return (
    <div className="flex min-h-screen">
      <div className="w-2/3 p-4 space-y-4">
        <h2 className="text-2xl">Video Consultation</h2>
        {!started && (
          <button
            onClick={invite}
            disabled={started}
            className={`w-48 h-14 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold text-lg rounded shadow hover:scale-105 transition-transform ${started ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Send call invitation to pet owner"
          >
            📞 Invite Owner
          </button>
        )}
        <div className="space-y-4">
          <div className="relative w-[720px] h-[405px] bg-black rounded overflow-hidden">
            <video ref={userVid} autoPlay muted className="w-full h-full object-cover" />
          </div>
          <div className="w-[720px] h-[405px] bg-black rounded overflow-hidden">
            <video ref={peerVid} autoPlay className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
      <div className="w-1/3 p-6 bg-white overflow-auto">
        <h2 className="text-lg mb-4">Prescription</h2>
        <p>Pet: {appt.petId.name}</p>
        <form className="space-y-3">
          {['symptoms', 'medication', 'dosage', 'instructions'].map((f) => (
            <div key={f}>
              <label className="block">{f}</label>
              <textarea
                rows="3"
                className="w-full border p-1"
                value={pres[f]}
                onChange={(e) => setPres({ ...pres, [f]: e.target.value })}
              />
            </div>
          ))}
        </form>
        <button
          onClick={finish}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
        >
          Finish
        </button>
      </div>
    </div>
  );
}