import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'react-hot-toast';
import {
  FiStar,
  FiCheck,
  FiArrowLeft,
  FiZap,
  FiAlertCircle,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiWifi,
  FiCreditCard,
  FiShield
} from 'react-icons/fi';
import { API_URL } from '../utils/api';
import { useAuth } from '../components/context/AuthContext'; // 🆕 IMPORT
import '../CSS/CheckoutPremium.css';

const CheckoutPremium = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth(); // 🆕 usuario desde contexto
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [reintentos, setReintentos] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [metodoPago, setMetodoPago] = useState('paypal');
  const [configPagos, setConfigPagos] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(false);

  // Cargar configuración de pagos al iniciar
  useEffect(() => {
    cargarConfiguracionPagos();
  }, []);

  const cargarConfiguracionPagos = async () => {
    try {
      setCargandoConfig(true);
      
      // Obtener el token del localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No hay token en localStorage. El usuario debe iniciar sesión.');
        // Se podría redirigir al login si se quiere
        // navigate('/iniciarSesion');
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`${API_URL}/configuracion/pagos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autorizado. Por favor, inicia sesión.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setConfigPagos(data.data);
      } else {
        throw new Error(data.message || 'Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error al cargar configuración de pagos:', error);
      
      let mensajeUsuario = 'No se pudo cargar la información de pagos.';
      if (error.message.includes('No autorizado') || error.message.includes('autenticado')) {
        mensajeUsuario = 'Debes iniciar sesión para ver los detalles de pago.';
      }
      
      toast.error(mensajeUsuario);
      
      // Usar valores por defecto si hay error
      setConfigPagos({
        sinpeNumero: '',
        sinpeNombre: '',
        whatsappNumero: '',
        planMensualMonto: 4.0,
        planAnualMonto: 8.0
      });
    } finally {
      setCargandoConfig(false);
    }
  };

  // Definir planes con valores de configuración o por defecto
  const planes = {
    mensual: {
      id: 'mensual',
      nombre: 'Plan Mensual',
      precio: configPagos?.planMensualMonto || 4.0,
      periodo: 'mes',
      descripcion: 'Facturación mensual',
      badge: null,
    },
    anual: {
      id: 'anual',
      nombre: 'Plan Anual',
      precio: configPagos?.planAnualMonto || 8.0,
      periodo: 'año',
      descripcion: 'Facturación anual',
      badge: '33% OFF',
      precioComparacion: (configPagos?.planMensualMonto || 4.0) * 12,
    },
  };

  // Calcular descuento para mostrar
  const calcularDescuento = () => {
    const precioMensual = planes.mensual.precio;
    const precioAnual = planes.anual.precio;
    if (precioMensual > 0) {
      return (((precioMensual * 12 - precioAnual) / (precioMensual * 12)) * 100).toFixed(0);
    }
    return '33';
  };

  const beneficios = [
    'Publicaciones adicionales tanto en eventos como en emprendimientos',
  ];

  const cambiarMetodoPago = (metodo) => {
    if (procesando) return;
    setMetodoPago(metodo);
    setErrorMessage('');
    setReintentos(0);
  };

  const createOrder = async (data, actions) => {
    const plan = planes[planSeleccionado];
    const storedUser = JSON.parse(localStorage.getItem('user')); // 🔁 renombrado para no chocar con authUser
    const userId = storedUser ? storedUser._id : null;

    return actions.order.create({
      purchase_units: [
        {
          description: `Komuness Premium - ${plan.nombre}`,
          amount: { value: plan.precio.toFixed(2), currency_code: 'USD' },
          custom_id: userId, // asocia la orden PayPal con el ID de usuario de MongoDB
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
      },
    });
  };

  const onApprove = async (data, actions) => {
    try {
      // Resetear estados
      setErrorMessage('');
      setReintentos(0);
      
      // 👉 Marcamos que empezó el procesamiento del pago
      setProcesando(true);

      const details = await actions.order.capture();
     

      toast.success('✅ Pago realizado con éxito. Activando Premium...', {
        duration: 5000,
        icon: '🎉',
        style: {
          background: "#D1FAE5",
          color: "#065F46",
          border: "2px solid #10B981",
          fontWeight: "600",
        },
      });

      // --- marcar premium en backend ---

      // 🆕 Intentar obtener token de localStorage y/o contexto
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      const storedToken = localStorage.getItem('token');
      const token = storedToken || storedUser?.token || authUser?.token; // 🔑 fuente única de verdad

      if (!token) {
        console.warn('No hay token en localStorage ni en contexto, no se puede activar premium en backend');
        toast.error('Debes iniciar sesión para activar tu cuenta premium.');
        setProcesando(false);
        navigate('/login');
        return;
      }

      // 👉 Actualizar el usuario actual a Premium en el backend (dinámico según token)
      try {
        const resPremium = await fetch(`${API_URL}/usuario/me/premium`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // 🆕 usamos siempre el token calculado
          },
          body: JSON.stringify({ plan: planSeleccionado || 'mensual' }),
        });

        const premiumData = await resPremium.json();

        if (!resPremium.ok) {
          console.error('Error al marcar premium en backend:', premiumData);
        } else {
          // Opcional: actualizar el usuario en localStorage para que la UI refleje el cambio
          const user = JSON.parse(localStorage.getItem('user'));
          if (user) {
            user.tipoUsuario = 3;
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      } catch (e) {
        console.error('Error al llamar /usuario/me/premium:', e);
      }

      // 👉 Aquí marcamos que ya terminó el procesamiento
      setProcesando(false);

      // Esperar un poco para que el usuario vea el mensaje y luego ir al perfil
      setTimeout(() => {
        navigate('/perfilUsuario');
         // window.location.reload(); // solo si quieres forzar recarga
      }, 2000);
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      setErrorMessage('Ocurrió un error inesperado. Por favor, intenta nuevamente.');
      toast.error('Error al procesar el pago. Contacta con soporte.');
      setProcesando(false);
    }
  };

  const onError = (err) => {
    console.error('Error en PayPal:', err);

    setProcesando(false);
    
    // Incrementar contador de reintentos
    setReintentos(prev => prev + 1);

    let userMessage = 'Error al procesar el pago.';

    if (err?.message?.includes('insufficient_funds')) {
      userMessage = 'Fondos insuficientes. Verifica tu método de pago.';
    } else if (err?.message?.includes('network')) {
      userMessage = 'Error de conexión. Verifica tu internet.';
    } else if (err?.message?.includes('timeout')) {
      userMessage = 'Tiempo de espera agotado. Intenta nuevamente.';
    } else if (err?.message?.includes('paypal')) {
      userMessage = 'Error en PayPal. Intenta con otro método de pago.';
    }

    setErrorMessage(userMessage);

    toast.error(userMessage, {
      duration: 6000,
      icon: '⚠️',
      style: {
        background: '#FEE2E2',
        color: '#991B1B',
        border: '2px solid #F87171',
        fontWeight: '600',
      },
    });
  };

  const onCancel = () => {
    toast('Pago cancelado', { icon: '❌' });
    setProcesando(false);
  };

  const paypalOptions = {
    'client-id': process.env.REACT_APP_PAYPAL_CLIENT_ID || 'sb',
    currency: 'USD',
    intent: 'capture',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <FiArrowLeft size={20} />
            Volver
          </button>

          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 rounded-full">
              <FiStar className="text-white" size={48} />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Actualiza a <span className="text-yellow-500">Premium</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Desbloquea todo el potencial de Komuness con publicaciones adicionales
          </p>
        </div>

        {/* Beneficios */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ¿Qué incluye Premium?
          </h2>
          <div className="flex justify-center">
            {beneficios.map((beneficio, index) => (
              <div key={index} className="flex items-center gap-3 max-w-2xl">
                <div className="bg-green-100 rounded-full p-1">
                  <FiCheck className="text-green-600" size={16} />
                </div>
                <span className="text-gray-700 text-center">{beneficio}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Planes */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Plan Mensual */}
          <div
            className={`plan-card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-8 cursor-pointer transition-all duration-300 relative overflow-hidden ${
              planSeleccionado === 'mensual'
                ? 'ring-4 ring-blue-500 scale-105 animate-glow'
                : 'hover:shadow-xl hover:scale-102'
            }`}
            onClick={() => {
              setPlanSeleccionado('mensual');
              setMetodoPago('paypal');
              setErrorMessage('');
              setReintentos(0);
            }}
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {planes.mensual.nombre}
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-gray-900">
                  ${planes.mensual.precio.toFixed(2)}
                </span>
                <span className="text-gray-600">/ {planes.mensual.periodo}</span>
              </div>
              <p className="text-gray-500 mt-2">{planes.mensual.descripcion}</p>
            </div>

            {planSeleccionado === 'mensual' && (
              <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold animate-scale-in">
                <FiCheckCircle size={20} className="animate-pulse" />
                Plan seleccionado
              </div>
            )}
          </div>

          {/* Plan Anual */}
          <div
            className={`plan-card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-2xl p-8 cursor-pointer transition-all duration-300 relative overflow-hidden ${
              planSeleccionado === 'anual'
                ? 'ring-4 ring-yellow-500 scale-105 animate-glow'
                : 'hover:shadow-xl hover:scale-102'
            }`}
            onClick={() => {
              setPlanSeleccionado('anual');
              setMetodoPago('paypal');
              setErrorMessage('');
              setReintentos(0);
            }}
          >
            {/* Badge con descuento dinámico */}
            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-bounce-soft">
              <FiZap size={14} />
              {calcularDescuento()}% OFF
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {planes.anual.nombre}
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-gray-900">
                  ${planes.anual.precio.toFixed(2)}
                </span>
                <span className="text-gray-600">/ {planes.anual.periodo}</span>
              </div>
              <p className="text-gray-500 mt-2">{planes.anual.descripcion}</p>
              <p className="text-sm text-gray-600 mt-1 line-through">
                ${planes.anual.precioComparacion.toFixed(2)} al año
              </p>
            </div>

            {planSeleccionado === 'anual' && (
              <div className="flex items-center justify-center gap-2 text-yellow-600 font-semibold mb-4 animate-scale-in">
                <FiCheckCircle size={20} className="animate-pulse" />
                Plan seleccionado
              </div>
            )}
          </div>
        </div>

        {/* Pago */}
        {planSeleccionado && (
          <div className="bg-white rounded-2xl shadow-lg p-8 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Completa tu pago
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Seleccionaste el{' '}
              <span className="font-semibold">
                {planes[planSeleccionado].nombre}
              </span>
              {' '}por{' '}
              <span className="font-bold text-green-600">
                ${planes[planSeleccionado].precio.toFixed(2)} USD
              </span>
            </p>

            {/* Método de pago */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
                Método de pago
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cambiarMetodoPago('paypal')}
                  disabled={procesando}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    metodoPago === 'paypal'
                      ? 'border-yellow-400 bg-yellow-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${procesando ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        metodoPago === 'paypal' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}
                    >
                      <FiCreditCard className="text-gray-800" size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">PayPal</p>
                      <p className="text-xs text-gray-600">Tarjeta o cuenta PayPal (USD)</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => cambiarMetodoPago('sinpe')}
                  disabled={procesando}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    metodoPago === 'sinpe'
                      ? 'border-blue-400 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${procesando ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        metodoPago === 'sinpe' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}
                    >
                      <FiWifi className="text-gray-800" size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">SINPE Móvil</p>
                      <p className="text-xs text-gray-600">
                        Transferencia (CRC) · Configuración en el paso 2
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {procesando && (
              <div className="flex flex-col items-center gap-4 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200 shadow-lg animate-slide-down">
                {/* Spinner animado mejorado */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-yellow-500 rounded-full animate-spin animate-reverse"></div>
                </div>

                {/* Mensaje principal */}
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800 flex items-center gap-2 justify-center">
                    <FiShield className="text-blue-600" />
                    Procesando pago seguro...
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Por favor no cierres esta ventana
                  </p>
                </div>

                {/* Barra de progreso de reintentos */}
                {reintentos > 0 && (
                  <div className="w-full max-w-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        Reintentando... ({reintentos}/3)
                      </span>
                      <span className="text-xs text-gray-600">
                        {reintentos === 1 ? '1 intento' : `${reintentos} intentos`}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-yellow-500 h-2 rounded-full transition-all duration-500 animate-pulse"
                        style={{ width: `${Math.min((reintentos / 3) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      {[1, 2, 3].map((num) => (
                        <div
                          key={num}
                          className={`flex items-center gap-1 text-xs font-medium transition-all duration-300 ${
                            num <= reintentos ? 'text-yellow-700 scale-110' : 'text-gray-400'
                          }`}
                        >
                          {num <= reintentos ? (
                            <FiCheckCircle className="animate-bounce" />
                          ) : (
                            <div className="w-3 h-3 border-2 border-current rounded-full"></div>
                          )}
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensaje adicional */}
                {reintentos > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-600 flex items-center gap-1 justify-center">
                      <FiWifi size={14} />
                      Verificando conexión y reintentando automáticamente...
                    </p>
                  </div>
                )}
              </div>
            )}

            {errorMessage && !procesando && (
              <div className="mb-6 animate-shake">
                {/* Caja de error mejorada con animación */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-6 shadow-lg">
                  {/* Icono y título */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <FiXCircle className="text-white" size={24} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-red-800 mb-1">
                        Error en el pago
                      </h4>
                      <p className="text-sm text-red-700 font-medium">
                        {errorMessage}
                      </p>
                    </div>
                  </div>

                  {/* Información de reintentos */}
                  {reintentos > 1 && (
                    <div className="mt-4 pt-4 border-t-2 border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiRefreshCw className="text-red-600" />
                          <span className="text-sm font-semibold text-red-700">
                            Intentos realizados
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(3)].map((_, index) => (
                            <div
                              key={index}
                              className={`w-3 h-3 rounded-full ${
                                index < reintentos
                                  ? 'bg-red-500 animate-pulse'
                                  : 'bg-red-200'
                              }`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-red-600 mt-2">
                        El sistema intentó procesar el pago {reintentos}{' '}
                        {reintentos === 1 ? 'vez' : 'veces'}
                      </p>
                    </div>
                  )}

                  {/* Sugerencias de acción */}
                  <div className="mt-4 p-3 bg-white rounded-lg border border-red-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <FiAlertCircle size={14} />
                      Qué puedes hacer:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 ml-5 list-disc">
                      <li>Verifica tu conexión a internet</li>
                      <li>Comprueba que tu método de pago tenga fondos</li>
                      <li>Intenta con otro método de pago</li>
                      <li>Contacta con soporte si el problema persiste</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {metodoPago === 'paypal' ? (
              <div className="max-w-md mx-auto">
                <PayPalScriptProvider options={paypalOptions}>
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      color: 'gold',
                      shape: 'rect',
                      label: 'paypal',
                    }}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={onError}
                    onCancel={onCancel}
                    disabled={procesando}
                  />
                </PayPalScriptProvider>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <p className="text-lg font-bold text-gray-800 flex items-center gap-2 justify-center">
                    <FiWifi className="text-blue-600" />
                    Pagar por SINPE Móvil
                  </p>

                  {cargandoConfig ? (
                    <div className="mt-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-sm text-gray-600">Cargando información de pago...</p>
                    </div>
                  ) : configPagos?.sinpeNumero ? (
                    <div className="mt-4 bg-white border border-blue-200 rounded-lg p-4">
                      <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-2">
                        <li>
                          Realiza el SINPE Móvil al número:{' '}
                          <span className="font-semibold text-blue-700">+506 {configPagos.sinpeNumero}</span>
                        </li>
                        <li>
                          A nombre de:{' '}
                          <span className="font-semibold text-blue-700">{configPagos.sinpeNombre}</span>
                        </li>
                        <li>
                          Monto a transferir:{' '}
                          <span className="font-bold text-green-600">
                            ${planSeleccionado === 'anual' ? configPagos.planAnualMonto : configPagos.planMensualMonto} USD
                          </span>
                        </li>
                        <li>
                          Envíanos el comprobante al WhatsApp{' '}
                          <a 
                            href={`https://wa.me/506${configPagos.whatsappNumero}?text=Hola,%20envío%20comprobante%20de%20pago%20para%20activar%20Premium`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-green-600 hover:underline"
                          >
                            +506 {configPagos.whatsappNumero}
                          </a>{' '}
                          para activar tu Premium.
                        </li>
                      </ol>
                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Nota:</strong> La activación se realiza manualmente después de verificar el pago. 
                          Por favor, guarda el comprobante.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 text-center">
                        ⚠️ SINPE Móvil no configurado. Por favor, contacta al administrador o usa PayPal.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FiShield className="text-green-600" />
                <p className="font-semibold text-gray-700">Pago 100% seguro</p>
              </div>
              <p className="text-xs text-gray-500">
                {metodoPago === 'paypal'
                  ? 'Procesado por PayPal · Tus datos están encriptados y protegidos'
                  : 'Pago por SINPE Móvil · Aprobación manual por administradores'}
              </p>
            </div>
          </div>
        )}

        {!planSeleccionado && (
          <div className="text-center text-gray-600 bg-white rounded-2xl shadow-lg p-8">
            <FiStar className="mx-auto mb-3 text-yellow-500 animate-pulse" size={48} />
            <p className="text-lg font-semibold">Selecciona un plan para continuar</p>
            <p className="text-sm text-gray-500 mt-2">
              Elige entre nuestros planes mensual o anual
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPremium;
