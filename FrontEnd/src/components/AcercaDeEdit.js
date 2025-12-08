import { useState, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { API_URL } from '../utils/api';
import { toast } from 'react-hot-toast';
import { 
  FaSave, 
  FaPlus, 
  FaTrash, 
  FaUpload,
  FaTimes,
  FaImage
} from 'react-icons/fa';
import '../CSS/AcercaDeEdit.css';

const AcercaDeEdit = ({ data, onUpdate, onCancel }) => {
  // Inicializar con valores por defecto para evitar undefined
  const [formData, setFormData] = useState(() => {
    const defaultData = {
      titulo: "",
      contenido: "",
      historia: "",
      mision: "",
      vision: "",
      queHacemos: "",
      motivacion: "",
      impacto: "",
      uneteCausa: "",
      informacionDonaciones: {
        cuentaBancaria: "",
        iban: "",
        nombreCuenta: "",
        cedulaJuridica: "",
        emailFinanzas: "",
        donacionesEspecie: []
      },
      contactos: {
        telefono: "",
        email: "",
        facebook: "",
        instagram: ""
      },
      equipo: [],
      imagenesProyectos: [],
      imagenesEquipo: []
    };
    
    return data ? { ...defaultData, ...data } : defaultData;
  });

  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Generar IDs únicos para formularios
  const formIds = useMemo(() => ({
    titulo: `titulo-${Date.now()}`,
    contenido: `contenido-${Date.now()}`,
    queHacemos: `quehacemos-${Date.now()}`,
    motivacion: `motivacion-${Date.now()}`,
    impacto: `impacto-${Date.now()}`,
    historia: `historia-${Date.now()}`,
    mision: `mision-${Date.now()}`,
    vision: `vision-${Date.now()}`,
    uneteCausa: `unetecausa-${Date.now()}`,
    cedulaJuridica: `cedula-${Date.now()}`,
    emailFinanzas: `email-${Date.now()}`,
    iban: `iban-${Date.now()}`,
    cuentaBancaria: `cuenta-${Date.now()}`,
    nombreCuenta: `nombrecuenta-${Date.now()}`,
    telefono: `telefono-${Date.now()}`,
    email: `emailcontacto-${Date.now()}`,
    facebook: `facebook-${Date.now()}`,
    instagram: `instagram-${Date.now()}`,
    cooperativa: `cooperativa-${Date.now()}`,
    banco: `banco-${Date.now()}`,
    donacionesEspecie: `donaciones-${Date.now()}`
  }), []);

  // Handlers optimizados con useCallback
  const handleInputChange = useCallback((section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value
      }
    }));
  }, []);

  const handleTextChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value || ""
    }));
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('No estás autenticado. Por favor inicia sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_URL}/acerca-de`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success('Información guardada exitosamente');
        onUpdate();
        onCancel();
      } else {
        throw new Error(responseData.message || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al guardar la información');
    } finally {
      setLoading(false);
    }
  };

  // Funciones para manejar el equipo optimizadas
  const handleAddMember = useCallback(() => {
    const newMember = {
      nombre: '',
      puesto: '',
      descripcion: '',
      formacion: [],
      experiencia: [],
      proyectosDestacados: [],
      reconocimientos: [],
      enlaces: []
    };
    setFormData(prev => ({
      ...prev,
      equipo: [...(prev.equipo || []), newMember]
    }));
  }, []);

  const handleMemberChange = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      equipo: prev.equipo.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  }, []);

  const handleDeleteMember = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      equipo: prev.equipo.filter((_, i) => i !== index)
    }));
  }, []);

  // Funciones para donaciones en especie
  const handleAddDonacionEspecie = useCallback(() => {
    const newDonaciones = [...(formData.informacionDonaciones?.donacionesEspecie || []), ''];
    handleInputChange('informacionDonaciones', 'donacionesEspecie', newDonaciones);
  }, [formData.informacionDonaciones?.donacionesEspecie, handleInputChange]);

  const handleDonacionEspecieChange = useCallback((index, value) => {
    const newDonaciones = [...(formData.informacionDonaciones?.donacionesEspecie || [])];
    newDonaciones[index] = value;
    handleInputChange('informacionDonaciones', 'donacionesEspecie', newDonaciones);
  }, [formData.informacionDonaciones?.donacionesEspecie, handleInputChange]);

  const handleDeleteDonacionEspecie = useCallback((index) => {
    const newDonaciones = formData.informacionDonaciones?.donacionesEspecie?.filter((_, i) => i !== index) || [];
    handleInputChange('informacionDonaciones', 'donacionesEspecie', newDonaciones);
  }, [formData.informacionDonaciones?.donacionesEspecie, handleInputChange]);


  const handleImageUpload = async (event, tipo) => {
  const file = event.target.files[0];
  if (!file) return;

  const token = localStorage.getItem('token');
  if (!token) {
    toast.error('No estás autenticado');
    return;
  }

  const uploadFormData = new FormData();
  uploadFormData.append('imagen', file);
  uploadFormData.append('tipo', tipo);

  try {
    setLoading(true);
    const response = await fetch(`${API_URL}/acerca-de/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: uploadFormData
    });

  

    // Obtener el texto de la respuesta primero para debugging
    const responseText = await response.text();
   

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(' Error parseando JSON:', parseError);
      throw new Error(`Respuesta inválida del servidor: ${responseText.substring(0, 100)}`);
    }

    if (response.ok) {
    
      toast.success('Imagen subida exitosamente');
      
      // Actualizar LOCALMENTE sin recargar todos los datos
      if (tipo === 'proyectos') {
        setFormData(prev => ({
          ...prev,
          imagenesProyectos: [...(prev.imagenesProyectos || []), result.path]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          imagenesEquipo: [...(prev.imagenesEquipo || []), result.path]
        }));
      }
    } else {
      console.error(' Error del servidor:', result);
      throw new Error(result.message || `Error ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error completo en handleImageUpload:', error);
    
    // Mostrar mensaje de error más específico
    let errorMessage = 'Error al subir imagen';
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Error de conexión. Verifica tu internet.';
    } else if (error.message.includes('413')) {
      errorMessage = 'La imagen es demasiado grande. Máximo 5MB.';
    } else if (error.message.includes('401')) {
      errorMessage = 'No autorizado. Tu sesión puede haber expirado.';
    } else {
      errorMessage = error.message || 'Error interno del servidor';
    }
    
    toast.error(errorMessage);
  } finally {
    setLoading(false);
    // Limpiar el input file
    event.target.value = '';
  }
};

  const handleDeleteImage = async (tipo, imagenPath) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/acerca-de/imagen`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tipo, imagenPath })
      });

      if (response.ok) {
        toast.success('Imagen eliminada');
        
        // Actualizar LOCALMENTE sin recargar todos los datos
        if (tipo === 'proyectos') {
          setFormData(prev => ({
            ...prev,
            imagenesProyectos: prev.imagenesProyectos?.filter(img => img !== imagenPath) || []
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            imagenesEquipo: prev.imagenesEquipo?.filter(img => img !== imagenPath) || []
          }));
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar imagen');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al eliminar imagen');
    }
  };

  
  const handleMemberImageUpload = async (event, memberIndex) => {
  const file = event.target.files[0];
  if (!file) return;

  const token = localStorage.getItem('token');
  if (!token) {
    toast.error('No estás autenticado');
    return;
  }

  const uploadFormData = new FormData();
  uploadFormData.append('imagen', file);
  uploadFormData.append('miembroIndex', memberIndex.toString());

  try {
    setLoading(true);
    

    const response = await fetch(`${API_URL}/acerca-de/upload-miembro`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: uploadFormData
    });

  

    const responseText = await response.text();
   

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(' Error parseando JSON miembro:', parseError);
      throw new Error(`Respuesta inválida del servidor: ${responseText.substring(0, 100)}`);
    }

    if (response.ok) {
     
      toast.success('Foto de perfil subida exitosamente');
      
      setFormData(prev => ({
        ...prev,
        equipo: prev.equipo.map((member, index) => 
          index === memberIndex 
            ? { ...member, imagen: result.path }
            : member
        )
      }));
    } else {
      console.error('Error del servidor miembro:', result);
      throw new Error(result.message || `Error ${response.status} al subir foto de perfil`);
    }
  } catch (error) {
    console.error('Error en handleMemberImageUpload:', error);
    toast.error(error.message || 'Error al subir foto de perfil');
  } finally {
    setLoading(false);
    // Limpiar el input file
    event.target.value = '';
  }
};

  const handleDeleteMemberImage = async (memberIndex, imagenPath) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/acerca-de/imagen-miembro`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          miembroIndex: memberIndex, 
          imagenPath 
        })
      });

      if (response.ok) {
        toast.success('Foto de perfil eliminada');
        
        // Actualizar LOCALMENTE eliminando la imagen del miembro
        setFormData(prev => ({
          ...prev,
          equipo: prev.equipo.map((member, index) => 
            index === memberIndex 
              ? { ...member, imagen: undefined }
              : member
          )
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar foto de perfil');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al eliminar foto de perfil');
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Editando Sección Acerca De</h1>
            <p className="text-gray-400 mt-2">Los cambios se guardarán al hacer clic en Guardar</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <FaTimes />
              <span>Cancelar</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <FaSave />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>

        {/* Gestión de Imágenes del Carrusel */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-400">IMÁGENES DEL CARRUSEL (PROYECTOS)</h2>
            <div>
              <input
                type="file"
                id="proyectos-upload"
                name="proyectos-upload"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'proyectos')}
                className="hidden"
                disabled={loading}
              />
              <label
                htmlFor="proyectos-upload"
                className={`bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FaUpload />
                <span>{loading ? 'Subiendo...' : 'Subir Imagen'}</span>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {formData.imagenesProyectos?.map((imagen, index) => (
              <div key={index} className="relative group">
                <img
                  src={imagen}
                  alt={`Proyecto ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg transform transition-transform duration-300 hover:scale-105"
                />
                <button
                  onClick={() => handleDeleteImage('proyectos', imagen)}
                  disabled={loading}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <FaTrash size={12} />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
          
          {(!formData.imagenesProyectos || formData.imagenesProyectos.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              <FaImage className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No hay imágenes en el carrusel</p>
              <p className="text-sm">Sube imágenes para mostrar en la sección de proyectos</p>
            </div>
          )}
        </div>

        {/* Sección Quiénes Somos */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">QUIÉNES SOMOS</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor={formIds.titulo} className="block text-sm font-medium mb-2">
                Título Principal
              </label>
              <input
                id={formIds.titulo}
                name="titulo"
                type="text"
                value={formData.titulo || ''}
                onChange={(e) => handleTextChange('titulo', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 responsive-input text-break disabled:opacity-50"
                autoComplete="organization"
              />
            </div>
            <div>
              <label htmlFor={formIds.contenido} className="block text-sm font-medium mb-2">
                Contenido Principal
              </label>
              <textarea
                id={formIds.contenido}
                name="contenido"
                value={formData.contenido || ''}
                onChange={(e) => handleTextChange('contenido', e.target.value)}
                rows="8"
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 responsive-textarea whitespace-pre-wrap text-break disabled:opacity-50"
                placeholder="Describe quiénes son como organización..."
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Secciones de Texto Expandidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {[
            { key: 'queHacemos', label: 'Qué Hacemos y Cómo lo Hacemos', id: formIds.queHacemos },
            { key: 'motivacion', label: 'Nuestra Motivación', id: formIds.motivacion },
            { key: 'impacto', label: 'El Impacto que Construimos', id: formIds.impacto },
            { key: 'historia', label: 'Nuestra Historia', id: formIds.historia },
            { key: 'mision', label: 'Misión', id: formIds.mision },
            { key: 'vision', label: 'Visión', id: formIds.vision }
          ].map((section) => (
            <div key={section.key} className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">{section.label}</h2>
              <textarea
                id={section.id}
                name={section.key}
                value={formData[section.key] || ''}
                onChange={(e) => handleTextChange(section.key, e.target.value)}
                rows="6"
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500 responsive-textarea whitespace-pre-wrap text-break disabled:opacity-50"
                placeholder={`Ingresa el contenido para ${section.label.toLowerCase()}...`}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        {/* Únete a Nuestra Causa - DESHABILITADA */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-400">ÚNETE A NUESTRA CAUSA</h2>
            <span className="bg-gray-600 text-gray-300 px-3 py-1 rounded-lg text-sm">
              No editable
            </span>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="mb-2">
              <p className="text-sm text-gray-400 italic">
                Esta sección no está disponible para edición.
              </p>
            </div>
            <label htmlFor={formIds.uneteCausa} className="block text-sm font-medium mb-2 sr-only">
              Únete a Nuestra Causa
            </label>
            <textarea
              id={formIds.uneteCausa}
              name="uneteCausa"
              value={formData.uneteCausa || ''}
              onChange={(e) => handleTextChange('uneteCausa', e.target.value)}
              rows="4"
              disabled={true}
              readOnly={true}
              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 responsive-textarea whitespace-pre-wrap text-break opacity-70 cursor-not-allowed"
              placeholder="Esta sección no está disponible para edición"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Información de Donaciones */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">INFORMACIÓN DE DONACIONES</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cooperativa */}
            <div>
              <label htmlFor={formIds.cooperativa} className="block text-sm font-medium mb-2">
                Cooperativa
              </label>
              <input
                id={formIds.cooperativa}
                name="cooperativa"
                type="text"
                value="Cooperativa Autogestionaria Y De Servicios R.L."
                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-gray-300 responsive-input"
                readOnly
                autoComplete="organization"
              />
            </div>

            {/* Cédula Jurídica */}
            <div>
              <label htmlFor={formIds.cedulaJuridica} className="block text-sm font-medium mb-2">
                Cédula Jurídica
              </label>
              <input
                id={formIds.cedulaJuridica}
                name="cedulaJuridica"
                type="text"
                value={formData.informacionDonaciones?.cedulaJuridica || ''}
                onChange={(e) => handleInputChange('informacionDonaciones', 'cedulaJuridica', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                placeholder="3-002-639930"
                autoComplete="off"
              />
            </div>

            {/* Email de Finanzas */}
            <div>
              <label htmlFor={formIds.emailFinanzas} className="block text-sm font-medium mb-2">
                Email de Finanzas
              </label>
              <input
                id={formIds.emailFinanzas}
                name="emailFinanzas"
                type="email"
                value={formData.informacionDonaciones?.emailFinanzas || ''}
                onChange={(e) => handleInputChange('informacionDonaciones', 'emailFinanzas', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                placeholder="coopesinergiafinanzas@gmail.com"
                autoComplete="email"
              />
            </div>

            {/* Banco */}
            <div>
              <label htmlFor={formIds.banco} className="block text-sm font-medium mb-2">
                Banco
              </label>
              <input
                id={formIds.banco}
                name="banco"
                type="text"
                value="BANCOPOPULAR"
                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-gray-300 responsive-input"
                readOnly
                autoComplete="off"
              />
            </div>

            {/* IBAN */}
            <div>
              <label htmlFor={formIds.iban} className="block text-sm font-medium mb-2">
                IBAN
              </label>
              <input
                id={formIds.iban}
                name="iban"
                type="text"
                value={formData.informacionDonaciones?.iban || ''}
                onChange={(e) => handleInputChange('informacionDonaciones', 'iban', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                placeholder="CR86016111084159641540"
                autoComplete="transaction-currency"
              />
            </div>

            {/* Cuenta Bancaria */}
            <div>
              <label htmlFor={formIds.cuentaBancaria} className="block text-sm font-medium mb-2">
                Cuenta Bancaria
              </label>
              <input
                id={formIds.cuentaBancaria}
                name="cuentaBancaria"
                type="text"
                value={formData.informacionDonaciones?.cuentaBancaria || ''}
                onChange={(e) => handleInputChange('informacionDonaciones', 'cuentaBancaria', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                placeholder="0005964154"
                autoComplete="cc-number"
              />
            </div>

            {/* Nombre de la Cuenta */}
            <div className="md:col-span-2">
              <label htmlFor={formIds.nombreCuenta} className="block text-sm font-medium mb-2">
                Nombre de la Cuenta
              </label>
              <input
                id={formIds.nombreCuenta}
                name="nombreCuenta"
                type="text"
                value={formData.informacionDonaciones?.nombreCuenta || ''}
                onChange={(e) => handleInputChange('informacionDonaciones', 'nombreCuenta', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                placeholder="Coopesinergia"
                autoComplete="organization"
              />
            </div>
          </div>

          {/* Donaciones en Especie - CON FIELDSET */}
          <fieldset className="mt-6">
            <legend className="block text-sm font-medium mb-2">
              Donaciones en Especie
            </legend>
            <div className="space-y-2">
              {formData.informacionDonaciones?.donacionesEspecie?.map((item, index) => (
                <div key={index} className="flex space-x-2">
                  <div className="flex-1">
                    <label htmlFor={`${formIds.donacionesEspecie}-${index}`} className="sr-only">
                      Donación en especie {index + 1}
                    </label>
                    <input
                      id={`${formIds.donacionesEspecie}-${index}`}
                      name={`donacion-especie-${index}`}
                      type="text"
                      value={item}
                      onChange={(e) => handleDonacionEspecieChange(index, e.target.value)}
                      disabled={loading}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                      placeholder="Ej: Alimentos en buen estado para el comedor"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteDonacionEspecie(index)}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg disabled:opacity-50"
                    type="button"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddDonacionEspecie}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
                type="button"
              >
                <FaPlus />
                <span>Agregar Donación en Especie</span>
              </button>
            </div>
          </fieldset>
        </div>

        {/* Gestión de Equipo */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-400">EQUIPO DE TRABAJO</h2>
            <button
              onClick={handleAddMember}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
              type="button"
            >
              <FaPlus />
              <span>Agregar Miembro</span>
            </button>
          </div>
          
          <div className="space-y-6">
            {formData.equipo?.map((miembro, index) => (
            <div key={index} className="border border-gray-600 rounded-lg p-6 bg-gray-750">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold">Miembro del Equipo {index + 1}</h3>
                  
                  {/* Gestión de foto de perfil */}
                  <div className="flex items-center space-x-2">
                    {miembro.imagen ? (
                      <div className="relative group">
                        <img
                          src={miembro.imagen}
                          alt={`${miembro.nombre || 'Miembro'} avatar`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"
                        />
                        <button
                          onClick={() => handleDeleteMemberImage(index, miembro.imagen)}
                          disabled={loading}
                          className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          type="button"
                        >
                          <FaTrash size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {miembro.nombre ? miembro.nombre.split(' ').map(n => n[0]).join('') : '?'}
                      </div>
                    )}
                    
                    <div>
                      <input
                        type="file"
                        id={`member-avatar-${index}`}
                        accept="image/*"
                        onChange={(e) => handleMemberImageUpload(e, index)}
                        className="hidden"
                        disabled={loading}
                      />
                      <label
                        htmlFor={`member-avatar-${index}`}
                        className={`text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded cursor-pointer transition-colors ${
                          loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {miembro.imagen ? 'Cambiar' : 'Subir'} Foto
                      </label>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteMember(index)}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  type="button"
                >
                  <FaTrash />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor={`miembro-${index}-nombre`} className="block text-sm font-medium mb-2">
                    Nombre
                  </label>
                  <input
                    id={`miembro-${index}-nombre`}
                    name={`equipo[${index}].nombre`}
                    type="text"
                    value={miembro.nombre}
                    onChange={(e) => handleMemberChange(index, 'nombre', e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 responsive-input disabled:opacity-50"
                    placeholder="Nombre completo"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor={`miembro-${index}-puesto`} className="block text-sm font-medium mb-2">
                    Puesto
                  </label>
                  <input
                    id={`miembro-${index}-puesto`}
                    name={`equipo[${index}].puesto`}
                    type="text"
                    value={miembro.puesto}
                    onChange={(e) => handleMemberChange(index, 'puesto', e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 responsive-input disabled:opacity-50"
                    placeholder="Puesto en la organización"
                    autoComplete="organization-title"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor={`miembro-${index}-descripcion`} className="block text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  id={`miembro-${index}-descripcion`}
                  name={`equipo[${index}].descripcion`}
                  value={miembro.descripcion}
                  onChange={(e) => handleMemberChange(index, 'descripcion', e.target.value)}
                  rows="3"
                  disabled={loading}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 responsive-textarea whitespace-pre-wrap text-break disabled:opacity-50"
                  placeholder="Descripción del rol y responsabilidades..."
                  autoComplete="off"
                />
              </div>

                {/* Campos adicionales del equipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Formación */}
                  <div>
                    <div className="block text-sm font-medium mb-2">Formación</div>
                    <div className="space-y-2">
                      {miembro.formacion?.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex space-x-2">
                          <div className="flex-1">
                            <label htmlFor={`miembro-${index}-formacion-${itemIndex}`} className="sr-only">
                              Formación {itemIndex + 1}
                            </label>
                            <input
                              id={`miembro-${index}-formacion-${itemIndex}`}
                              name={`equipo[${index}].formacion[${itemIndex}]`}
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newFormacion = [...(miembro.formacion || [])];
                                newFormacion[itemIndex] = e.target.value;
                                handleMemberChange(index, 'formacion', newFormacion);
                              }}
                              disabled={loading}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm responsive-input disabled:opacity-50"
                              placeholder={`Formación ${itemIndex + 1}`}
                              autoComplete="off"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newFormacion = miembro.formacion?.filter((_, i) => i !== itemIndex) || [];
                              handleMemberChange(index, 'formacion', newFormacion);
                            }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm disabled:opacity-50"
                            type="button"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newFormacion = [...(miembro.formacion || []), ''];
                          handleMemberChange(index, 'formacion', newFormacion);
                        }}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
                        type="button"
                      >
                        <FaPlus size={12} />
                        <span>Agregar Formación</span>
                      </button>
                    </div>
                  </div>

                  {/* Experiencia */}
                  <div>
                    <div className="block text-sm font-medium mb-2">Experiencia</div>
                    <div className="space-y-2">
                      {miembro.experiencia?.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex space-x-2">
                          <div className="flex-1">
                            <label htmlFor={`miembro-${index}-experiencia-${itemIndex}`} className="sr-only">
                              Experiencia {itemIndex + 1}
                            </label>
                            <input
                              id={`miembro-${index}-experiencia-${itemIndex}`}
                              name={`equipo[${index}].experiencia[${itemIndex}]`}
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newExperiencia = [...(miembro.experiencia || [])];
                                newExperiencia[itemIndex] = e.target.value;
                                handleMemberChange(index, 'experiencia', newExperiencia);
                              }}
                              disabled={loading}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm responsive-input disabled:opacity-50"
                              placeholder={`Experiencia ${itemIndex + 1}`}
                              autoComplete="off"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newExperiencia = miembro.experiencia?.filter((_, i) => i !== itemIndex) || [];
                              handleMemberChange(index, 'experiencia', newExperiencia);
                            }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm disabled:opacity-50"
                            type="button"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newExperiencia = [...(miembro.experiencia || []), ''];
                          handleMemberChange(index, 'experiencia', newExperiencia);
                        }}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
                        type="button"
                      >
                        <FaPlus size={12} />
                        <span>Agregar Experiencia</span>
                      </button>
                    </div>
                  </div>

                  {/* Proyectos Destacados */}
                  <div>
                    <div className="block text-sm font-medium mb-2">Proyectos Destacados</div>
                    <div className="space-y-2">
                      {miembro.proyectosDestacados?.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex space-x-2">
                          <div className="flex-1">
                            <label htmlFor={`miembro-${index}-proyectos-${itemIndex}`} className="sr-only">
                              Proyecto {itemIndex + 1}
                            </label>
                            <input
                              id={`miembro-${index}-proyectos-${itemIndex}`}
                              name={`equipo[${index}].proyectosDestacados[${itemIndex}]`}
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newProyectos = [...(miembro.proyectosDestacados || [])];
                                newProyectos[itemIndex] = e.target.value;
                                handleMemberChange(index, 'proyectosDestacados', newProyectos);
                              }}
                              disabled={loading}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm responsive-input disabled:opacity-50"
                              placeholder={`Proyecto ${itemIndex + 1}`}
                              autoComplete="off"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newProyectos = miembro.proyectosDestacados?.filter((_, i) => i !== itemIndex) || [];
                              handleMemberChange(index, 'proyectosDestacados', newProyectos);
                            }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm disabled:opacity-50"
                            type="button"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newProyectos = [...(miembro.proyectosDestacados || []), ''];
                          handleMemberChange(index, 'proyectosDestacados', newProyectos);
                        }}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
                        type="button"
                      >
                        <FaPlus size={12} />
                        <span>Agregar Proyecto</span>
                      </button>
                    </div>
                  </div>

                  {/* Reconocimientos */}
                  <div>
                    <div className="block text-sm font-medium mb-2">Reconocimientos</div>
                    <div className="space-y-2">
                      {miembro.reconocimientos?.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex space-x-2">
                          <div className="flex-1">
                            <label htmlFor={`miembro-${index}-reconocimientos-${itemIndex}`} className="sr-only">
                              Reconocimiento {itemIndex + 1}
                            </label>
                            <input
                              id={`miembro-${index}-reconocimientos-${itemIndex}`}
                              name={`equipo[${index}].reconocimientos[${itemIndex}]`}
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newReconocimientos = [...(miembro.reconocimientos || [])];
                                newReconocimientos[itemIndex] = e.target.value;
                                handleMemberChange(index, 'reconocimientos', newReconocimientos);
                              }}
                              disabled={loading}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm responsive-input disabled:opacity-50"
                              placeholder={`Reconocimiento ${itemIndex + 1}`}
                              autoComplete="off"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newReconocimientos = miembro.reconocimientos?.filter((_, i) => i !== itemIndex) || [];
                              handleMemberChange(index, 'reconocimientos', newReconocimientos);
                            }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm disabled:opacity-50"
                            type="button"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newReconocimientos = [...(miembro.reconocimientos || []), ''];
                          handleMemberChange(index, 'reconocimientos', newReconocimientos);
                        }}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
                        type="button"
                      >
                        <FaPlus size={12} />
                        <span>Agregar Reconocimiento</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Enlaces - Sección separada */}
                <div className="mt-4">
                  <div className="block text-sm font-medium mb-2">Enlaces</div>
                  <div className="space-y-2">
                    {miembro.enlaces?.map((enlace, enlaceIndex) => (
                      <div key={enlaceIndex} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label htmlFor={`miembro-${index}-enlace-${enlaceIndex}-nombre`} className="sr-only">
                            Nombre del enlace {enlaceIndex + 1}
                          </label>
                          <input
                            id={`miembro-${index}-enlace-${enlaceIndex}-nombre`}
                            name={`equipo[${index}].enlaces[${enlaceIndex}].nombre`}
                            type="text"
                            value={enlace.nombre || ''}
                            onChange={(e) => {
                              const newEnlaces = [...(miembro.enlaces || [])];
                              newEnlaces[enlaceIndex] = {
                                ...newEnlaces[enlaceIndex],
                                nombre: e.target.value
                              };
                              handleMemberChange(index, 'enlaces', newEnlaces);
                            }}
                            disabled={loading}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm responsive-input disabled:opacity-50"
                            placeholder="Nombre del enlace"
                            autoComplete="off"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <label htmlFor={`miembro-${index}-enlace-${enlaceIndex}-url`} className="sr-only">
                              URL del enlace {enlaceIndex + 1}
                            </label>
                            <input
                              id={`miembro-${index}-enlace-${enlaceIndex}-url`}
                              name={`equipo[${index}].enlaces[${enlaceIndex}].url`}
                              type="url"
                              value={enlace.url || ''}
                              onChange={(e) => {
                                const newEnlaces = [...(miembro.enlaces || [])];
                                newEnlaces[enlaceIndex] = {
                                  ...newEnlaces[enlaceIndex],
                                  url: e.target.value
                                };
                                handleMemberChange(index, 'enlaces', newEnlaces);
                              }}
                              disabled={loading}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm responsive-input disabled:opacity-50"
                              placeholder="https://..."
                              autoComplete="url"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newEnlaces = miembro.enlaces?.filter((_, i) => i !== enlaceIndex) || [];
                              handleMemberChange(index, 'enlaces', newEnlaces);
                            }}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm disabled:opacity-50"
                            type="button"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newEnlaces = [...(miembro.enlaces || []), { nombre: '', url: '' }];
                        handleMemberChange(index, 'enlaces', newEnlaces);
                      }}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1 disabled:opacity-50"
                      type="button"
                    >
                      <FaPlus size={12} />
                      <span>Agregar Enlace</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contactos */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">INFORMACIÓN DE CONTACTO</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor={formIds.telefono} className="block text-sm font-medium mb-2">
                Teléfono
              </label>
              <input
                id={formIds.telefono}
                name="telefono"
                type="text"
                value={formData.contactos?.telefono || ''}
                onChange={(e) => handleInputChange('contactos', 'telefono', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                autoComplete="tel"
              />
            </div>
            <div>
              <label htmlFor={formIds.email} className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id={formIds.email}
                name="email"
                type="email"
                value={formData.contactos?.email || ''}
                onChange={(e) => handleInputChange('contactos', 'email', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor={formIds.facebook} className="block text-sm font-medium mb-2">
                Facebook
              </label>
              <input
                id={formIds.facebook}
                name="facebook"
                type="url"
                value={formData.contactos?.facebook || ''}
                onChange={(e) => handleInputChange('contactos', 'facebook', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                placeholder="https://www.facebook.com/..."
                autoComplete="url"
              />
            </div>
            <div>
              <label htmlFor={formIds.instagram} className="block text-sm font-medium mb-2">
                Instagram
              </label>
              <input
                id={formIds.instagram}
                name="instagram"
                type="url"
                value={formData.contactos?.instagram || ''}
                onChange={(e) => handleInputChange('contactos', 'instagram', e.target.value)}
                disabled={loading}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 responsive-input disabled:opacity-50"
                placeholder="https://www.instagram.com/..."
                autoComplete="url"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcercaDeEdit;