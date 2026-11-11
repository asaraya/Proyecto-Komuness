import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../utils/api';
import {
  FiSmartphone,
  FiUser,
  FiX,
  FiCheck,
  FiCreditCard,
  FiMessageSquare,
  FiPackage,
  FiEdit3,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
  FiClock,
  FiTag,
  FiZap
} from 'react-icons/fi';
import '../CSS/adminModales.css';

const crearPaqueteVacio = () => ({
  nombre: '',
  descripcion: '',
  monto: '',
  moneda: 'USD',
  duracionDias: '30',
  limitePublicaciones: '',
  beneficiosTexto: '',
  activo: true
});

const toNumberOrUndefined = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ModalConfiguracionPagos = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('pagos');
  const [configuracion, setConfiguracion] = useState({
    sinpeNumero: '',
    sinpeNombre: '',
    whatsappNumero: ''
  });
  const [configOriginal, setConfigOriginal] = useState({
    sinpeNumero: '',
    sinpeNombre: '',
    whatsappNumero: ''
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [paquetes, setPaquetes] = useState([]);
  const [paquetesLoading, setPaquetesLoading] = useState(false);
  const [paqueteSaving, setPaqueteSaving] = useState(false);
  const [paqueteEditId, setPaqueteEditId] = useState(null);
  const [paqueteForm, setPaqueteForm] = useState(crearPaqueteVacio());
  const [filtroPaquetes, setFiltroPaquetes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('pagos');
      cargarConfiguracionPagos();
      cargarPaquetes();
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
          whatsappNumero: data.data.whatsappNumero || ''
        };

        setConfiguracion(nuevaConfig);
        setConfigOriginal(nuevaConfig);
      } else {
        throw new Error(data.message || 'Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error al cargar configuración de pagos:', error);
      toast.error(`Error: ${error.message}`);

      const defaultConfig = {
        sinpeNumero: '',
        sinpeNombre: '',
        whatsappNumero: ''
      };
      setConfiguracion(defaultConfig);
      setConfigOriginal(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const cargarPaquetes = async () => {
    try {
      setPaquetesLoading(true);
      const response = await fetch(`${API_URL}/paquetes-suscripcion/get-paquetes`);
      if (!response.ok) {
        throw new Error('Error al cargar paquetes');
      }
      const data = await response.json();
      setPaquetes(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error al cargar paquetes:', error);
      toast.error('Error al cargar paquetes de suscripción');
    } finally {
      setPaquetesLoading(false);
    }
  };

  const parseBeneficiosTexto = (texto) =>
    texto
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean);

  const formatearMonto = (monto, moneda) => {
    const safeMonto = Number.isFinite(Number(monto)) ? Number(monto).toFixed(2) : '0.00';
    return `${moneda || 'USD'} ${safeMonto}`;
  };

  const formatearDuracion = (dias) => {
    const safeDias = Number.isFinite(Number(dias)) ? Number(dias) : 0;
    return `${safeDias} día${safeDias === 1 ? '' : 's'}`;
  };

  const paquetesFiltrados = useMemo(() => {
    const filtro = filtroPaquetes.trim().toLowerCase();
    if (!filtro) return paquetes;
    return paquetes.filter((paquete) => {
      const nombre = (paquete.nombre || '').toLowerCase();
      const descripcion = (paquete.descripcion || '').toLowerCase();
      const beneficios = Array.isArray(paquete.beneficios)
        ? paquete.beneficios.join(' ').toLowerCase()
        : '';
      return nombre.includes(filtro) || descripcion.includes(filtro) || beneficios.includes(filtro);
    });
  }, [paquetes, filtroPaquetes]);

  const statsPaquetes = useMemo(() => {
    const activos = paquetes.filter((paquete) => paquete.activo).length;
    return { activos, inactivos: paquetes.length - activos };
  }, [paquetes]);

  const previewPaquete = useMemo(() => {
    const beneficios = parseBeneficiosTexto(paqueteForm.beneficiosTexto || '');
    return {
      nombre: paqueteForm.nombre?.trim() || 'Nuevo paquete',
      descripcion: paqueteForm.descripcion?.trim() || 'Describe aquí los beneficios del plan.',
      monto: toNumberOrUndefined(paqueteForm.monto) ?? 0,
      moneda: paqueteForm.moneda || 'USD',
      duracionDias: toNumberOrUndefined(paqueteForm.duracionDias) ?? 30,
      limitePublicaciones: toNumberOrUndefined(paqueteForm.limitePublicaciones),
      beneficios,
      activo: paqueteForm.activo
    };
  }, [paqueteForm]);

  const construirPayloadDesdeFormulario = () => {
    const monto = toNumberOrUndefined(paqueteForm.monto);
    const duracionDias = toNumberOrUndefined(paqueteForm.duracionDias);
    const limitePublicaciones = toNumberOrUndefined(paqueteForm.limitePublicaciones);

    if (!paqueteForm.nombre.trim()) {
      toast.error('El nombre del paquete es obligatorio');
      return null;
    }
    if (monto === undefined || monto <= 0) {
      toast.error('El monto debe ser un número mayor a 0');
      return null;
    }
    if (duracionDias === undefined || duracionDias <= 0) {
      toast.error('La duración debe ser mayor a 0');
      return null;
    }
    if (limitePublicaciones !== undefined && limitePublicaciones < 0) {
      toast.error('El límite de publicaciones debe ser mayor o igual a 0');
      return null;
    }

    const payload = {
      nombre: paqueteForm.nombre.trim(),
      descripcion: paqueteForm.descripcion?.trim() ?? '',
      monto,
      moneda: paqueteForm.moneda || 'USD',
      duracionDias,
      tipoUsuarioOtorgado: 3,
      beneficios: parseBeneficiosTexto(paqueteForm.beneficiosTexto || ''),
      activo: paqueteForm.activo
    };

    if (limitePublicaciones !== undefined) {
      payload.limitePublicaciones = limitePublicaciones;
    }

    return payload;
  };

  const limpiarPaqueteForm = () => {
    setPaqueteForm(crearPaqueteVacio());
    setPaqueteEditId(null);
  };

  const handleGuardarPaquete = async () => {
    const payload = construirPayloadDesdeFormulario();
    if (!payload) return;

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Debes iniciar sesión para gestionar paquetes');
      return;
    }

    setPaqueteSaving(true);
    try {
      const url = paqueteEditId
        ? `${API_URL}/paquetes-suscripcion/update-paquete/${paqueteEditId}`
        : `${API_URL}/paquetes-suscripcion/create-paquete`;

      const method = paqueteEditId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar el paquete');
      }

      toast.success(paqueteEditId ? 'Paquete actualizado' : 'Paquete creado');
      await cargarPaquetes();
      limpiarPaqueteForm();
    } catch (error) {
      console.error('Error al guardar paquete:', error);
      toast.error(error.message || 'Error al guardar el paquete');
    } finally {
      setPaqueteSaving(false);
    }
  };

  const actualizarPaquete = async (id, payload, mensajeExito) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Debes iniciar sesión para gestionar paquetes');
      return;
    }

    setPaqueteSaving(true);
    try {
      const response = await fetch(`${API_URL}/paquetes-suscripcion/update-paquete/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Error al actualizar el paquete');
      }

      toast.success(mensajeExito);
      await cargarPaquetes();
    } catch (error) {
      console.error('Error al actualizar paquete:', error);
      toast.error(error.message || 'Error al actualizar el paquete');
    } finally {
      setPaqueteSaving(false);
    }
  };

  const handleEditarPaquete = (paquete) => {
    setPaqueteEditId(paquete._id);
    setPaqueteForm({
      nombre: paquete.nombre || '',
      descripcion: paquete.descripcion || '',
      monto: paquete.monto !== undefined ? String(paquete.monto) : '',
      moneda: paquete.moneda || 'USD',
      duracionDias: paquete.duracionDias !== undefined ? String(paquete.duracionDias) : '30',
      limitePublicaciones:
        paquete.limitePublicaciones !== undefined && paquete.limitePublicaciones !== null
          ? String(paquete.limitePublicaciones)
          : '',
      beneficiosTexto: Array.isArray(paquete.beneficios) ? paquete.beneficios.join('\n') : '',
      activo: paquete.activo !== false
    });
  };

  const handleEliminarPaquete = async (paquete) => {
    if (!window.confirm(`¿Eliminar el paquete "${paquete.nombre}"?`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Debes iniciar sesión para gestionar paquetes');
      return;
    }

    setPaqueteSaving(true);
    try {
      const response = await fetch(`${API_URL}/paquetes-suscripcion/delete-paquete/${paquete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Error al eliminar el paquete');
      }

      toast.success('Paquete eliminado');
      await cargarPaquetes();
      if (paqueteEditId === paquete._id) {
        limpiarPaqueteForm();
      }
    } catch (error) {
      console.error('Error al eliminar paquete:', error);
      toast.error(error.message || 'Error al eliminar el paquete');
    } finally {
      setPaqueteSaving(false);
    }
  };

  const handleTogglePaquete = (paquete) => {
    const payload = {
      nombre: paquete.nombre?.trim() || 'Paquete',
      descripcion: paquete.descripcion || '',
      monto: Number(paquete.monto || 0),
      moneda: paquete.moneda || 'USD',
      duracionDias: Number(paquete.duracionDias || 1),
      tipoUsuarioOtorgado: paquete.tipoUsuarioOtorgado ?? 3,
      beneficios: Array.isArray(paquete.beneficios) ? paquete.beneficios : [],
      activo: !paquete.activo
    };

    if (paquete.limitePublicaciones !== undefined && paquete.limitePublicaciones !== null) {
      payload.limitePublicaciones = paquete.limitePublicaciones;
    }

    actualizarPaquete(
      paquete._id,
      payload,
      paquete.activo ? 'Paquete desactivado' : 'Paquete activado'
    );
  };

  const handleGuardar = async () => {
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

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no es JSON:', text.substring(0, 500));

        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('La ruta /api/configuracion/pagos no existe (404). Verifica que el servidor backend tenga esta ruta.');
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
    configuracion.whatsappNumero !== configOriginal.whatsappNumero;

  if (!isOpen) return null;

  return (
    <div className="kw-admin-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Configuración de Pagos y Paquetes
          </h2>
          <button
            onClick={handleCancelar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 text-sm mb-6">
            Administra los métodos de pago y los paquetes de suscripción premium desde un solo lugar.
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('pagos')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'pagos'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pagos
            </button>
            <button
              onClick={() => setActiveTab('paquetes')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'paquetes'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Paquetes
            </button>
          </div>

          {activeTab === 'pagos' && (
            <>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
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
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'paquetes' && (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-xl">
              <div className="pointer-events-none absolute -top-20 right-6 h-40 w-40 rounded-full bg-emerald-400/30 blur-3xl"></div>
              <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 -translate-x-1/3 translate-y-1/3 rounded-full bg-indigo-500/30 blur-3xl"></div>

              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <FiPackage size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Paquetes de suscripción</h3>
                      <p className="text-sm text-slate-200">
                        Diseña, publica y ajusta planes premium en tiempo real.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={limpiarPaqueteForm}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
                    >
                      <FiPlus size={14} />
                      Nuevo paquete
                    </button>
                    <button
                      onClick={cargarPaquetes}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
                    >
                      <FiRefreshCw size={14} />
                      Recargar
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        placeholder="Buscar por nombre, descripción o beneficio"
                        value={filtroPaquetes}
                        onChange={(e) => setFiltroPaquetes(e.target.value)}
                        className="flex-1 min-w-[200px] rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span className="rounded-full bg-white/10 px-3 py-1">Total: {paquetes.length}</span>
                        <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-200">
                          Activos: {statsPaquetes.activos}
                        </span>
                        <span className="rounded-full bg-rose-400/20 px-3 py-1 text-rose-200">
                          Inactivos: {statsPaquetes.inactivos}
                        </span>
                      </div>
                    </div>

                    {paquetesLoading ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="h-40 rounded-xl bg-white/10 animate-pulse"></div>
                        <div className="h-40 rounded-xl bg-white/10 animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {paquetesFiltrados.map((paquete) => (
                          <div
                            key={paquete._id}
                            className={`relative rounded-xl border ${
                              paquete.activo ? 'border-emerald-400/40' : 'border-white/10'
                            } bg-white/10 p-4 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-2xl ${
                              paqueteEditId === paquete._id ? 'ring-2 ring-yellow-300/70' : ''
                            }`}
                          >
                            <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl opacity-70"></div>
                            <div className="relative">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-lg font-semibold leading-tight">{paquete.nombre}</h4>
                                  <p className="text-xs text-slate-200 mt-1">
                                    {paquete.descripcion || 'Sin descripción'}
                                  </p>
                                </div>
                                <span
                                  className={`text-[11px] px-2 py-1 rounded-full ${
                                    paquete.activo
                                      ? 'bg-emerald-400/20 text-emerald-200'
                                      : 'bg-slate-500/30 text-slate-200'
                                  }`}
                                >
                                  {paquete.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-200">
                                <div className="flex items-center gap-2">
                                  <FiTag className="text-yellow-300" size={14} />
                                  <span>{formatearMonto(paquete.monto, paquete.moneda)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FiClock className="text-sky-300" size={14} />
                                  <span>{formatearDuracion(paquete.duracionDias)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FiZap className="text-violet-300" size={14} />
                                  <span>Tipo {paquete.tipoUsuarioOtorgado ?? 3}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FiPackage className="text-emerald-300" size={14} />
                                  <span>
                                    {paquete.limitePublicaciones !== undefined &&
                                    paquete.limitePublicaciones !== null
                                      ? `${paquete.limitePublicaciones} pubs`
                                      : 'Sin límite'}
                                  </span>
                                </div>
                              </div>

                              {Array.isArray(paquete.beneficios) && paquete.beneficios.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {paquete.beneficios.slice(0, 3).map((beneficio, index) => (
                                    <span
                                      key={index}
                                      className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80"
                                    >
                                      {beneficio}
                                    </span>
                                  ))}
                                  {paquete.beneficios.length > 3 && (
                                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80">
                                      +{paquete.beneficios.length - 3} más
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleEditarPaquete(paquete)}
                                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
                                >
                                  <FiEdit3 size={12} />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleEliminarPaquete(paquete)}
                                  className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
                                  disabled={paqueteSaving}
                                >
                                  <FiTrash2 size={12} />
                                  Eliminar
                                </button>
                                <button
                                  onClick={() => handleTogglePaquete(paquete)}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
                                  disabled={paqueteSaving}
                                >
                                  {paquete.activo ? 'Desactivar' : 'Activar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {paquetesFiltrados.length === 0 && (
                          <div className="col-span-full rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-slate-200">
                            No hay paquetes que coincidan con el filtro.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">
                          {paqueteEditId ? 'Editar paquete' : 'Nuevo paquete'}
                        </h4>
                        <p className="text-xs text-slate-200">
                          Completa los datos y guarda para reflejar cambios de inmediato.
                        </p>
                      </div>
                      {paqueteEditId && (
                        <button
                          onClick={limpiarPaqueteForm}
                          className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20"
                        >
                          <FiX size={12} />
                          Cancelar
                        </button>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleGuardarPaquete();
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-300">
                            Nombre del paquete
                          </label>
                          <input
                            type="text"
                            value={paqueteForm.nombre}
                            onChange={(e) => setPaqueteForm({ ...paqueteForm, nombre: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Ej: Plan Mensual"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-300">
                            Descripción breve
                          </label>
                          <textarea
                            rows="2"
                            value={paqueteForm.descripcion}
                            onChange={(e) => setPaqueteForm({ ...paqueteForm, descripcion: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Ej: Acceso total a beneficios premium"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-300">
                              Monto
                            </label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={paqueteForm.monto}
                              onChange={(e) => setPaqueteForm({ ...paqueteForm, monto: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-300">
                              Moneda
                            </label>
                            <select
                              value={paqueteForm.moneda}
                              onChange={(e) => setPaqueteForm({ ...paqueteForm, moneda: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <option value="USD">USD</option>
                              <option value="CRC">CRC</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-300">
                              Duración (días)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={paqueteForm.duracionDias}
                              onChange={(e) =>
                                setPaqueteForm({ ...paqueteForm, duracionDias: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-300">
                              Límite de publicaciones
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={paqueteForm.limitePublicaciones}
                              onChange={(e) =>
                                setPaqueteForm({ ...paqueteForm, limitePublicaciones: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="Opcional"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-300">
                            Beneficios (uno por línea)
                          </label>
                          <textarea
                            rows="3"
                            value={paqueteForm.beneficiosTexto}
                            onChange={(e) =>
                              setPaqueteForm({ ...paqueteForm, beneficiosTexto: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Ej: Acceso a publicaciones ilimitadas"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={paqueteForm.activo}
                            onChange={(e) =>
                              setPaqueteForm({ ...paqueteForm, activo: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-white/30 bg-white/10 text-indigo-500 focus:ring-indigo-400"
                          />
                          Paquete activo
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-400 disabled:opacity-50"
                          disabled={paqueteSaving}
                        >
                          <FiCheck size={14} />
                          {paqueteSaving
                            ? 'Guardando...'
                            : paqueteEditId
                            ? 'Actualizar paquete'
                            : 'Crear paquete'}
                        </button>
                        <button
                          type="button"
                          onClick={limpiarPaqueteForm}
                          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
                        >
                          Limpiar
                        </button>
                      </div>
                    </form>

                    <div className="mt-6 rounded-xl border border-white/20 bg-black/20 p-4">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-300">
                        <span>Vista previa</span>
                        <span
                          className={`rounded-full px-2 py-1 ${
                            previewPaquete.activo
                              ? 'bg-emerald-400/20 text-emerald-200'
                              : 'bg-slate-500/30 text-slate-200'
                          }`}
                        >
                          {previewPaquete.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="mt-3 rounded-lg bg-white/10 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h5 className="text-base font-semibold">{previewPaquete.nombre}</h5>
                            <p className="text-xs text-slate-200 mt-1">{previewPaquete.descripcion}</p>
                          </div>
                          <span className="text-xs text-slate-200">
                            {formatearMonto(previewPaquete.monto, previewPaquete.moneda)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-200">
                          <span className="inline-flex items-center gap-1">
                            <FiClock size={12} />
                            {formatearDuracion(previewPaquete.duracionDias)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FiPackage size={12} />
                            {previewPaquete.limitePublicaciones !== undefined
                              ? `${previewPaquete.limitePublicaciones} pubs`
                              : 'Sin límite'}
                          </span>
                        </div>
                        {previewPaquete.beneficios.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {previewPaquete.beneficios.slice(0, 4).map((beneficio, index) => (
                              <span
                                key={index}
                                className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80"
                              >
                                {beneficio}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          {activeTab === 'pagos' ? (
            <>
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
            </>
          ) : (
            <button
              onClick={handleCancelar}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2"
            >
              <FiX size={18} />
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalConfiguracionPagos;