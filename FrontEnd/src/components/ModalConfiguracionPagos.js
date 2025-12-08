import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../utils/api';
import { FiDollarSign, FiSmartphone, FiUser, FiX, FiCheck, FiCreditCard, FiMessageSquare } from 'react-icons/fi';



const ModalConfiguracionPagos = ({ isOpen, onClose }) => {
  const [configuracion, setConfiguracion] = useState({
    sinpeNumero: '',
    sinpeNombre: '',
    whatsappNumero: '',  
    planMensualMonto: '4.0',
    planAnualMonto: '8.0'
  });
  const [configOriginal, setConfigOriginal] = useState({
    sinpeNumero: '',
    sinpeNombre: '',
    whatsappNumero: '',  
    planMensualMonto: '4.0',
    planAnualMonto: '8.0'
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarConfiguracionPagos();
    }
  }, [isOpen]);

  const cargarConfiguracionPagos = async () => {
    try {
      setLoading(true);
    
      
      const response = await fetch(`${API_URL}/configuracion/pagos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

    
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al cargar configuración de pagos`);
      }

      const data = await response.json();
     
      
      if (data.success) {
        const nuevaConfig = {
          sinpeNumero: data.data.sinpeNumero || '',
          sinpeNombre: data.data.sinpeNombre || '',
          whatsappNumero: data.data.whatsappNumero || '',  
          planMensualMonto: String(data.data.planMensualMonto || '4.0'),
          planAnualMonto: String(data.data.planAnualMonto || '8.0')
        };

       
        setConfiguracion(nuevaConfig);
        setConfigOriginal(nuevaConfig);
      } else {
        throw new Error(data.message || 'Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error al cargar configuración de pagos:', error);
      toast.error(`Error: ${error.message}`);
      
      // Configuración por defecto
      const defaultConfig = {
        sinpeNumero: '',
        sinpeNombre: '',
        whatsappNumero: '',
        planMensualMonto: '4.0',
        planAnualMonto: '8.0'
      };
      setConfiguracion(defaultConfig);
      setConfigOriginal(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    // Validaciones...
    setGuardando(true);

    try {
        
        
        const response = await fetch(`${API_URL}/configuracion/pagos`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(configuracion)
        });

       

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error(' Respuesta no es JSON:', text.substring(0, 500));
            
            // Verificar si es HTML de error 404
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                throw new Error(`La ruta /api/configuracion/pagos no existe (404). Verifica que el servidor backend tenga esta ruta.`);
            }
            
            throw new Error(`El servidor devolvió: ${contentType}. Status: ${response.status}`);
        }

        const data = await response.json();
        

        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
        }

        if (data.success) {
            toast.success('¡Configuración actualizada correctamente!');
            setConfigOriginal(configuracion);
            setTimeout(() => {
                onClose();
            }, 1000);
        } else {
            throw new Error(data.message || 'Error desconocido del servidor');
        }
    } catch (error) {
        console.error('Error completo:', error);
        
        // Mensaje específico para errores de ruta
        if (error.message.includes('no existe') || error.message.includes('404')) {
            toast.error(
                <div>
                    <strong>Error de ruta:</strong> La ruta /api/configuracion/pagos no existe en el servidor.
                    <br />
                    <small>Contacta al administrador para configurar las rutas del backend.</small>
                </div>,
                { duration: 8000 }
            );
        } else {
            toast.error(`Error: ${error.message}`);
        }
    } finally {
        setGuardando(false);
    }
};
  const handleCancelar = () => {
    setConfiguracion(configOriginal);
    onClose();
  };

  const cambiosRealizados = 
    configuracion.sinpeNumero !== configOriginal.sinpeNumero ||
    configuracion.sinpeNombre !== configOriginal.sinpeNombre ||
    configuracion.whatsappNumero !== configOriginal.whatsappNumero || 
    configuracion.planMensualMonto !== configOriginal.planMensualMonto ||
    configuracion.planAnualMonto !== configOriginal.planAnualMonto;

  // Calcular descuento para mostrar
  const montoMensual = parseFloat(configuracion.planMensualMonto) || 4.0;
  const montoAnual = parseFloat(configuracion.planAnualMonto) || 8.0;
  const descuento = montoMensual > 0 
    ? ((montoMensual * 12 - montoAnual) / (montoMensual * 12) * 100).toFixed(0)
    : '0';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Configuración de Pagos
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
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-6">
                Configura los métodos de pago disponibles para los usuarios premium.
                Los usuarios que paguen por SINPE deberán enviar el comprobante al WhatsApp configurado.
              </p>

              {/* Sección SINPE Móvil */}
              <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiSmartphone className="text-blue-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-800">SINPE Móvil</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de teléfono
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSmartphone className="text-gray-400" size={20} />
                      </div>
                      <input
                        type="tel"
                        placeholder="Ej: 88888888"
                        value={configuracion.sinpeNumero}
                        onChange={(e) => setConfiguracion({
                          ...configuracion,
                          sinpeNumero: e.target.value.replace(/\D/g, '')
                        })}
                        className="pl-10 w-full px-4 py-3 text-gray-900 rounded-lg border-2 border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength="8"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Solo números, sin guiones ni espacios
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del propietario
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="text-gray-400" size={20} />
                      </div>
                      <input
                        type="text"
                        placeholder="Ej: Juan Pérez"
                        value={configuracion.sinpeNombre}
                        onChange={(e) => setConfiguracion({
                          ...configuracion,
                          sinpeNombre: e.target.value
                        })}
                        className="pl-10 w-full px-4 py-3 text-gray-900 rounded-lg border-2 border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength="50"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Nombre que aparece en el SINPE Móvil
                    </p>
                  </div>
                </div>
              </div>

              {/* ✅ NUEVA SECCIÓN: WhatsApp para comprobantes */}
              <div className="border-2 border-green-300 bg-green-50 rounded-lg p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiMessageSquare className="text-green-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-800">WhatsApp para Comprobantes</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de WhatsApp
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSmartphone className="text-gray-400" size={20} />
                      </div>
                      <input
                        type="tel"
                        placeholder="Ej: 88888888"
                        value={configuracion.whatsappNumero}
                        onChange={(e) => setConfiguracion({
                          ...configuracion,
                          whatsappNumero: e.target.value.replace(/\D/g, '')
                        })}
                        className="pl-10 w-full px-4 py-3 text-gray-900 rounded-lg border-2 border-green-400 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        maxLength="8"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Número donde los usuarios enviarán los comprobantes de pago
                    </p>
                  </div>

                  <div className="bg-white border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-semibold mb-2">
                      📱 Mensaje que verán los usuarios:
                    </p>
                    <p className="text-xs text-gray-600">
                      "Después de realizar el SINPE Móvil, envía el comprobante al WhatsApp{' '}
                      <span className="font-bold text-green-700">
                        +506 {configuracion.whatsappNumero || 'XXXX-XXXX'}
                      </span>{' '}
                      para activar tu Premium."
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección Montos de Planes */}
              <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FiDollarSign className="text-yellow-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-800">Montos de Planes Premium</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Plan Mensual */}
                  <div className="bg-white border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-yellow-100 rounded">
                        <span className="text-yellow-600 font-bold">M</span>
                      </div>
                      <h4 className="font-semibold text-gray-800">Plan Mensual</h4>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600 mb-1">
                        Monto en USD
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-700">$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={configuracion.planMensualMonto}
                          onChange={(e) => setConfiguracion({
                            ...configuracion,
                            planMensualMonto: e.target.value
                          })}
                          className="pl-7 w-full px-3 py-2 text-lg font-bold text-gray-900 rounded border border-yellow-300 bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mt-2">
                      <p className="font-medium">Cálculo anual:</p>
                      <p className="text-gray-700">
                        ${montoMensual.toFixed(2)} × 12 = <span className="font-bold">${(montoMensual * 12).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Plan Anual */}
                  <div className="bg-white border border-yellow-200 rounded-lg p-4 relative">
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      -{descuento}%
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-yellow-100 rounded">
                        <span className="text-yellow-600 font-bold">A</span>
                      </div>
                      <h4 className="font-semibold text-gray-800">Plan Anual</h4>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600 mb-1">
                        Monto en USD
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-700">$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={configuracion.planAnualMonto}
                          onChange={(e) => setConfiguracion({
                            ...configuracion,
                            planAnualMonto: e.target.value
                          })}
                          className="pl-7 w-full px-3 py-2 text-lg font-bold text-gray-900 rounded border border-yellow-300 bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mt-2">
                      <p className="font-medium">Ahorro anual:</p>
                      <p className="text-green-600 font-bold">
                        ${(montoMensual * 12 - montoAnual).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumen de comparación */}
                <div className="mt-4 p-3 bg-white border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Resumen:</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• Mensual: ${montoMensual.toFixed(2)} USD/mes</p>
                    <p>• Anual: ${montoAnual.toFixed(2)} USD/año</p>
                    <p>• Ahorro anual: <span className="font-bold text-green-600">${(montoMensual * 12 - montoAnual).toFixed(2)}</span></p>
                    <p>• Descuento: <span className="font-bold text-red-600">{descuento}%</span></p>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <FiCreditCard className="h-5 w-5 text-blue-500 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Nota:</strong> Los cambios se reflejarán inmediatamente en la página de checkout. 
                      Los usuarios verán estos montos y la información de pago cuando seleccionen el método SINPE.
                      Deberán enviar el comprobante al WhatsApp configurado para activar su Premium.
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
                    {configuracion.sinpeNumero !== configOriginal.sinpeNumero && (
                      <p>• SINPE: {configOriginal.sinpeNumero || '(vacío)'} → {configuracion.sinpeNumero || '(vacío)'}</p>
                    )}
                    {configuracion.sinpeNombre !== configOriginal.sinpeNombre && (
                      <p>• Nombre SINPE: {configOriginal.sinpeNombre || '(vacío)'} → {configuracion.sinpeNombre || '(vacío)'}</p>
                    )}
                    {configuracion.whatsappNumero !== configOriginal.whatsappNumero && (
                      <p>• WhatsApp: {configOriginal.whatsappNumero || '(vacío)'} → {configuracion.whatsappNumero || '(vacío)'}</p>
                    )}
                    {configuracion.planMensualMonto !== configOriginal.planMensualMonto && (
                      <p>• Plan Mensual: ${configOriginal.planMensualMonto} → ${configuracion.planMensualMonto}</p>
                    )}
                    {configuracion.planAnualMonto !== configOriginal.planAnualMonto && (
                      <p>• Plan Anual: ${configOriginal.planAnualMonto} → ${configuracion.planAnualMonto}</p>
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

export default ModalConfiguracionPagos;