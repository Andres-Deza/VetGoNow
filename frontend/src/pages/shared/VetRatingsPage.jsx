import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import RatingDisplay from '../../components/RatingDisplay';
import VetRatingSummary from '../../components/VetRatingSummary';
import StarRating from '../../components/StarRating';

const VetRatingsPage = () => {
  const { vetId } = useParams();
  const [ratings, setRatings] = useState([]);
  const [vet, setVet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';

  useEffect(() => {
    const fetchRatings = async () => {
      setLoading(true);
      try {
        const [ratingsRes, vetRes] = await Promise.all([
          axios.get(`${API_BASE}/api/ratings/vet/${vetId}?page=${page}&limit=${limit}`),
          axios.get(`${API_BASE}/api/vets/${vetId}`)
        ]);

        if (ratingsRes.data.success) {
          setRatings(ratingsRes.data.ratings);
          setTotalPages(ratingsRes.data.totalPages);
        }

        if (vetRes.data) {
          setVet(vetRes.data);
        }
      } catch (err) {
        console.error('Error fetching ratings:', err);
        setError('No se pudieron cargar las calificaciones');
      } finally {
        setLoading(false);
      }
    };

    if (vetId) {
      fetchRatings();
    }
  }, [vetId, page, API_BASE]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando calificaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Calificaciones
            {vet && (
              <span className="text-violet-600"> - Dr. {vet.name}</span>
            )}
          </h1>
        </div>

        {/* Resumen de Calificaciones */}
        {vet && <VetRatingSummary vet={vet} showDetails={true} />}

        {/* Lista de Calificaciones */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Todas las Calificaciones ({ratings.length})
          </h2>

          {ratings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aún no hay calificaciones</h3>
              <p className="text-gray-600">Las calificaciones aparecerán aquí cuando los usuarios califiquen las atenciones.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <RatingDisplay key={rating._id} rating={rating} showDetails={true} />
              ))}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-gray-700 font-medium">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VetRatingsPage;

