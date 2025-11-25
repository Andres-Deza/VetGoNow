import React, { useState } from 'react';
import { FaBug, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';

const DebugPanel = ({ pet, mode, triage, location, assignment, pricing, consent, payment }) => {
  const [isOpen, setIsOpen] = useState(false);

  const checkField = (field, name) => {
    if (field === null || field === undefined) {
      return { status: 'error', message: `${name} está vacío` };
    }
    if (typeof field === 'object' && Object.keys(field).length === 0) {
      return { status: 'warning', message: `${name} es un objeto vacío` };
    }
    return { status: 'success', message: `${name} OK` };
  };

  const checks = [
    { name: 'Pet', field: pet, required: true },
    { name: 'Mode', field: mode, required: true },
    { name: 'Triage', field: triage, required: true },
    { name: 'Location', field: location, required: true },
    { name: 'Assignment', field: assignment, required: false },
    { name: 'Pricing', field: pricing, required: true },
    { name: 'Consent', field: consent, required: true },
    { name: 'Payment', field: payment, required: true }
  ];

  const getIcon = (status) => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="text-green-500" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return null;
    }
  };

  if (!import.meta.env.DEV) return null; // Solo en desarrollo

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-all"
        title="Debug Panel"
      >
        <FaBug size={20} />
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-2xl border border-gray-300 w-96 max-h-96 overflow-y-auto">
          <div className="p-4 bg-purple-600 text-white font-bold rounded-t-lg flex items-center justify-between">
            <span>🐛 Debug Panel - Emergency</span>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
              ✕
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Status de campos */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">Estado de Campos:</h3>
              {checks.map((check, index) => {
                const result = checkField(check.field, check.name);
                return (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {getIcon(result.status)}
                    <span className={`${result.status === 'error' ? 'text-red-600' : result.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {result.message}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Detalles de campos */}
            <div className="border-t pt-3 space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">Detalles:</h3>
              
              {pet && (
                <div className="text-xs bg-gray-50 p-2 rounded">
                  <strong>Pet:</strong> {pet.name || 'Sin nombre'} ({pet._id || pet.id})
                </div>
              )}

              {mode && (
                <div className="text-xs bg-gray-50 p-2 rounded">
                  <strong>Mode:</strong> {mode}
                </div>
              )}

              {triage && (
                <div className="text-xs bg-gray-50 p-2 rounded">
                  <strong>Triage:</strong>
                  <ul className="ml-4 mt-1">
                    <li>• Razón: {triage.mainReason || 'N/A'}</li>
                    <li>• Síntomas: {triage.symptoms?.length || 0}</li>
                    <li>• Críticos: {triage.criticalFlags?.length || 0}</li>
                  </ul>
                </div>
              )}

              {location && (
                <div className="text-xs bg-gray-50 p-2 rounded">
                  <strong>Location:</strong>
                  <ul className="ml-4 mt-1">
                    <li>• Dir: {location.address || 'N/A'}</li>
                    <li>• Lat/Lng: {location.lat?.toFixed(4) || 'N/A'} / {location.lng?.toFixed(4) || 'N/A'}</li>
                  </ul>
                </div>
              )}

              {pricing && (
                <div className="text-xs bg-gray-50 p-2 rounded">
                  <strong>Pricing:</strong>
                  <ul className="ml-4 mt-1">
                    <li>• Base: ${pricing.base || 0}</li>
                    <li>• Total: ${pricing.total || 0}</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Token check */}
            <div className="border-t pt-3">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Autenticación:</h3>
              <div className="text-xs bg-gray-50 p-2 rounded space-y-1">
                <div>
                  <strong>Token:</strong> {localStorage.getItem('token') ? '✅ Presente' : '❌ Ausente'}
                </div>
                {localStorage.getItem('token') && (() => {
                  try {
                    const token = localStorage.getItem('token');
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const expired = payload.exp * 1000 < Date.now();
                    return (
                      <>
                        <div>
                          <strong>User ID:</strong> {payload.id || 'N/A'}
                        </div>
                        <div>
                          <strong>Expira:</strong> {expired ? '❌ EXPIRADO' : '✅ Válido'}
                        </div>
                        {!expired && (
                          <div>
                            <strong>Tiempo restante:</strong> {Math.floor((payload.exp * 1000 - Date.now()) / 1000 / 60)} min
                          </div>
                        )}
                      </>
                    );
                  } catch (e) {
                    return <div className="text-red-600">❌ Token inválido</div>;
                  }
                })()}
              </div>
            </div>

            {/* API Base */}
            <div className="border-t pt-3">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Configuración:</h3>
              <div className="text-xs bg-gray-50 p-2 rounded">
                <div><strong>API_BASE:</strong> {import.meta.env.VITE_API_BASE || 'http://localhost:5555'}</div>
                <div><strong>DEV:</strong> {import.meta.env.DEV ? 'Sí' : 'No'}</div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="border-t pt-3 space-y-2">
              <button
                onClick={() => {
                  console.log('=== DEBUG INFO ===');
                  console.log('Pet:', pet);
                  console.log('Mode:', mode);
                  console.log('Triage:', triage);
                  console.log('Location:', location);
                  console.log('Assignment:', assignment);
                  console.log('Pricing:', pricing);
                  console.log('Consent:', consent);
                  console.log('Payment:', payment);
                  console.log('Token:', localStorage.getItem('token'));
                  alert('Info copiada a la consola (F12)');
                }}
                className="w-full bg-blue-500 text-white text-xs py-2 px-3 rounded hover:bg-blue-600 transition"
              >
                📋 Log to Console
              </button>

              <button
                onClick={() => {
                  const data = {
                    pet, mode, triage, location, assignment, pricing, consent, payment,
                    token: localStorage.getItem('token'),
                    apiBase: import.meta.env.VITE_API_BASE || 'http://localhost:5555'
                  };
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                  alert('Datos copiados al portapapeles!');
                }}
                className="w-full bg-green-500 text-white text-xs py-2 px-3 rounded hover:bg-green-600 transition"
              >
                📎 Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;

