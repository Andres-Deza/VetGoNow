import React, { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';

const WaitingPage = () => {
  const [certificateImage, setCertificateImage] = useState("");

  const handleCertificateChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setCertificateImage(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!user) {
      alert("You are not logged in.");
      return;
    }

    try {
        console.log("Submitting certificate for user ID:", user.id); // ✅ Print user ID

        await axios.put(
        `${API_BASE}/api/vets/${user.id}/certificate`,
        { certificateImage },
        { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Certificate submitted successfully!");
    } catch (err) {
        console.error(err);
        alert("Failed to upload certificate.");
    }
  };

  const handleGoHome = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div style={styles.container}>
      <h2>Your account is not approved yet</h2>
      <p style={styles.message}>
        Please submit your certificate for verification. Our admins will review and approve your account shortly.
      </p>

      <div style={styles.uploadBox}>
        <label htmlFor="certificate-upload" style={styles.uploadLabel}>
          {!certificateImage && <span style={styles.plusSign}>+</span>}
          {certificateImage && (
            <img src={certificateImage} alt="Certificate Preview" style={styles.preview} />
          )}
        </label>
        <input
          id="certificate-upload"
          type="file"
          accept="image/*"
          onChange={handleCertificateChange}
          style={{ display: "none" }}
        />
      </div>

      <button onClick={handleUpload} style={styles.button}>
        Submit Certificate
      </button>

      <button style={{ ...styles.button, marginTop: "10px" }} onClick={handleGoHome}>
        Go to Landing Page
      </button>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "450px",
    margin: "100px auto",
    padding: "20px",
    textAlign: "center",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  message: {
    fontSize: "16px",
    color: "#555",
    marginBottom: "20px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  uploadBox: {
    width: "100%",
    height: "200px",
    border: "2px dashed #ccc",
    borderRadius: "10px",
    marginBottom: "20px",
    position: "relative",
    overflow: "hidden",
  },
  uploadLabel: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
  },
  plusSign: {
    fontSize: "48px",
    color: "#ccc",
  },
  preview: {
    position: "absolute",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    top: 0,
    left: 0,
  },
};

export default WaitingPage;
