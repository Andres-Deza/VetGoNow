// src/pages/PaymentProcessing.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const PaymentProcessing = () => {
  const { id } = useParams(); // booking ID from route
  const navigate = useNavigate();

  useEffect(() => {
    // El pago con Mercado Pago se procesa automáticamente en el backend
    // Redirigir a la página de éxito después de un breve delay
    setTimeout(() => {
      navigate(`/payment-success`);
    }, 2000);
  }, [id, navigate]);

  return (
    <div className="payment-processing">
      <h2>Procesando tu pago...</h2>
      <p>Por favor espera mientras confirmamos tu transacción con Mercado Pago.</p>
    </div>
  );
};

export default PaymentProcessing;
