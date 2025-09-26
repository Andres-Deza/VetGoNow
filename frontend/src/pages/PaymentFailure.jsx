import { useNavigate } from 'react-router-dom';

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Pago fallido</h2>
        <p className="text-gray-700 mb-6">Desafortunadamente, tu pago no pudo ser procesado.</p>
        <button
          onClick={() => navigate('/user-dashboard')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
        >
          Volver al Panel
        </button>
      </div>
    </div>
  );
};

export default PaymentFailure;
