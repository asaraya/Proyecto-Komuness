import { useNavigate, useLocation } from "react-router-dom";
import { API_URL } from '../utils/api';
import { useState } from 'react';

export const PublicacionModal = ({ name, date, tag, id, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen && !showSuccess) return null;

  const rutas = {
    evento: `/eventos`,
    emprendimiento: `/emprendimientos`,
    publicacion: `/publicaciones`
  };

  const eliminarPublicacion = async () => {
    try {
      setIsDeleting(true);
      
      // Verificar que tenemos token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No se encontró token de autenticación");
        showErrorMessage("Error de autenticación. Por favor, inicie sesión nuevamente.");
        setIsDeleting(false);
        return;
      }

    

      const res = await fetch(`${API_URL}/publicaciones/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });

    

      if (res.ok) {
        const data = await res.json();
        
        
        setIsDeleting(false);
        
        // Mostrar mensaje de éxito elegante
        setShowSuccess(true);
        
        // Cerrar automáticamente después de 2 segundos
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
          window.location.reload();
        }, 2000);

      } else {
        setIsDeleting(false);
        
        // Leer el error del servidor
        const errorData = await res.text();
        console.error(`Error del servidor (${res.status}):`, errorData);

        if (res.status === 401) {
          showErrorMessage("No tiene permisos para eliminar esta publicación");
        } else if (res.status === 404) {
          showErrorMessage("La publicación no fue encontrada");
        } else {
          showErrorMessage(`Error al eliminar la publicación: ${errorData}`);
        }
      }
    } catch (err) {
      setIsDeleting(false);
      console.error("Error en la solicitud:", err);
      showErrorMessage("Error de conexión. Verifique su conexión a internet e intente nuevamente.");
    }
  };

  const showErrorMessage = (message) => {
    // Crear un toast de error más elegante
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
    errorToast.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(errorToast);
    
    // Animación de entrada
    setTimeout(() => {
      errorToast.classList.remove('translate-x-full');
    }, 100);
    
    // Remover después de 4 segundos
    setTimeout(() => {
      errorToast.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 300);
    }, 4000);
  };

  // Modal de confirmación
  if (!showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#2A2A35] text-white p-6 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,1)] w-[90%] max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold">¿Está seguro/a de borrar la publicación?</h2>
            <p className="text-sm text-gray-300">{name}</p>
            <p className="text-sm text-gray-300">{date}</p>
            
            <p className="text-xs text-gray-400 mt-2">Esta acción no se puede deshacer</p>

            {/* Botones */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={eliminarPublicacion}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-6 py-2 rounded-lg text-white transition-colors duration-200 flex items-center gap-2 min-w-[100px] justify-center"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 px-6 py-2 rounded-lg text-white transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal de éxito
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2A2A35] text-white p-8 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,1)] w-[90%] max-w-md text-center animate-pulse">
        <div className="flex flex-col items-center gap-4">
          {/* Icono de éxito con animación */}
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-green-400">¡Eliminado!</h2>
          <p className="text-gray-300">La publicación se eliminó correctamente</p>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-600 rounded-full h-1 mt-4">
            <div className="bg-green-400 h-1 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
          <p className="text-xs text-gray-400">Cerrando automáticamente...</p>
        </div>
      </div>
    </div>
  );
};

export default PublicacionModal;