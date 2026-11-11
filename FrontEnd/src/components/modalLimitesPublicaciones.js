import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../utils/api';
import { FiUsers, FiStar, FiX, FiCheck } from 'react-icons/fi';
import '../CSS/adminModales.css';

const ModalLimitesPublicaciones = ({ isOpen, onClose }) => {
  const [limites, setLimites] = useState({
    limiteBasico: '',
    limitePremium: ''
  });
  const [limitesOriginales, setLimitesOriginales] = useState({
    limiteBasico: '',
    limitePremium: ''
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarConfiguracion();
    }
  }, [isOpen]);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/configuracion`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar configuración');
      }

      const data = await response.json();
      
      if (data.success) {
        const configs = data.data;
        const basico = configs.find(c => c.clave === 'limite_publicaciones_basico');
        const premium = configs.find(c => c.clave === 'limite_publicaciones_premium');
        
        const nuevosLimites = {
          limiteBasico: String(basico?.valor || 10),
          limitePremium: String(premium?.valor || 50)
        };

        setLimites(nuevosLimites);
        setLimitesOriginales(nuevosLimites);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      toast.error('Error al cargar la configuración de límites');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    // Convertir a números para validar
    const limiteBasicoNum = parseInt(limites.limiteBasico) || 0;
    const limitePremiumNum = parseInt(limites.limitePremium) || 0;

    // Validaciones
    if (limiteBasicoNum < 0 || limitePremiumNum < 0) {
      toast.error('Los límites deben ser números mayores o iguales a 0');
      return;
    }

    if (limiteBasicoNum > limitePremiumNum) {
      toast.error('El límite premium debe ser mayor o igual al límite básico');
      return;
    }

    setGuardando(true);

    const promesa = fetch(`${API_URL}/configuracion/limites-publicaciones`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        limiteBasico: limiteBasicoNum,
        limitePremium: limitePremiumNum
      })
    });

    toast.promise(promesa, {
      loading: 'Guardando límites...',
      success: '¡Límites actualizados correctamente!',
      error: 'Error al actualizar límites'
    });

    try {
      const response = await promesa;
      const data = await response.json();

      if (data.success) {
        setLimitesOriginales(limites);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error(data.message || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error al actualizar límites:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    setLimites(limitesOriginales);
    onClose();
  };

  const cambiosRealizados = 
    limites.limiteBasico !== limitesOriginales.limiteBasico || 
    limites.limitePremium !== limitesOriginales.limitePremium;

  if (!isOpen) return null;

  return (
    <div className="kw-admin-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Configuración de Límites de Publicaciones
          </h2>
          <button
            onClick={handleCancelar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-6">
                Estos límites se aplicarán a todos los usuarios según su tipo (básico o premium). 

              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Límite Básico */}
                <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiUsers className="text-blue-600" size={24} />
                    </div>
                    <h3 className="font-semibold text-gray-800">Usuarios Básicos</h3>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-gray-600 mb-2">
                      Límite de publicaciones
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={limites.limiteBasico}
                      onChange={(e) => setLimites({
                        ...limites, 
                        limiteBasico: e.target.value
                      })}
                      className="w-full px-4 py-3 text-2xl font-bold text-gray-900 rounded-lg border-2 border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                 
                </div>

                {/* Límite Premium */}
                <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FiStar className="text-yellow-600" size={24} />
                    </div>
                    <h3 className="font-semibold text-yellow-800">Usuarios Premium</h3>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm text-yellow-700 mb-2">
                      Límite de publicaciones
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={limites.limitePremium}
                      onChange={(e) => setLimites({
                        ...limites, 
                        limitePremium: e.target.value
                      })}
                      className="w-full px-4 py-3 text-2xl font-bold text-gray-900 rounded-lg border-2 border-yellow-400 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Nota importante:</strong> Los cambios se aplicarán inmediatamente a todos los usuarios 
                     
                    </p>
                  </div>
                </div>
              </div>

              {/* Mostrar cambios pendientes */}
              {cambiosRealizados && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-yellow-800 font-semibold">
                    ⚠️ Tienes cambios sin guardar
                  </p>
                  <div className="text-xs text-yellow-700 mt-2 space-y-1">
                    {limites.limiteBasico !== limitesOriginales.limiteBasico && (
                      <p>• Límite básico: {limitesOriginales.limiteBasico} → {limites.limiteBasico}</p>
                    )}
                    {limites.limitePremium !== limitesOriginales.limitePremium && (
                      <p>• Límite premium: {limitesOriginales.limitePremium} → {limites.limitePremium}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={handleCancelar}
            disabled={guardando}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <FiX size={18} />
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !cambiosRealizados}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCheck size={18} />
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalLimitesPublicaciones;
