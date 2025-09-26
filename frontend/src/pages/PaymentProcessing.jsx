// src/pages/PaymentProcessing.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const PaymentProcessing = () => {
  const { id } = useParams(); // booking ID from route
  const navigate = useNavigate();

  useEffect(() => {
    // Aquí es donde llamarías al backend para confirmar el pago, etc.
    // Para la demostración, simplemente redirige a la página de éxito después de 2 segundos.
    setTimeout(() => {
      navigate(`/api/payment/webpay/success/${id}`);
    }, 2000);
  }, [id, navigate]);

  return (
    <div className="payment-processing">
      <h2>Procesando tu pago...</h2>
      <p>Por favor espera mientras confirmamos tu transacción con Webpay.</p>
    </div>
  );
};

export default PaymentProcessing;
