import { useState, useRef } from 'react';
import { API_URL, BASE_URL } from '../utils/api';
import { toast } from 'react-hot-toast';
import '../CSS/subidaArchivo.css';
import { FaTrash, FaFileAlt, FaImage } from 'react-icons/fa';
import { verifySingleFile, acceptAttr } from '../utils/fileValidation';

const SubidaArchivo = ({ tipo, archivoActual, onSubida }) => {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const inputFileRef = useRef(null);

  const esFoto = tipo === 'foto';
  const esCV = tipo === 'cv';

  const validarArchivo = (file) => {
    const maxSize = esFoto ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB para fotos, 10MB para CV
    const allowedTypes = esFoto 
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      : ['application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      toast.error(esFoto 
        ? 'Solo se permiten imágenes JPG, PNG o WEBP' 
        : 'Solo se permiten archivos PDF'
      );
      return false;
    }

    if (file.size > maxSize) {
      toast.error(`El archivo excede el tamaño máximo de ${esFoto ? '5MB' : '10MB'}`);
      return false;
    }

    return true;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file && validarArchivo(file) && await verifySingleFile(file, esFoto ? 'images' : 'pdf')) {
      // Previsualización para fotos
      if (esFoto) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPrevisualizacion(reader.result);
        };
        reader.readAsDataURL(file);
      }
      
      subirArchivo(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && validarArchivo(file) && await verifySingleFile(file, esFoto ? 'images' : 'pdf')) {
      if (esFoto) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPrevisualizacion(reader.result);
        };
        reader.readAsDataURL(file);
      }
      
      subirArchivo(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const subirArchivo = async (file) => {
    try {
      setSubiendo(true);
      setProgreso(0);

      const formData = new FormData();
      formData.append(esFoto ? 'foto' : 'cv', file);

      const endpoint = esFoto ? '/perfil/foto' : '/perfil/cv';

      // Simular progreso
      const interval = setInterval(() => {
        setProgreso(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      clearInterval(interval);
      setProgreso(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir el archivo');
      }

      const data = await response.json();
      const urlArchivo = esFoto ? data.fotoPerfil : data.cvUrl;

      toast.success(esFoto ? 'Foto subida exitosamente' : 'CV subido exitosamente');
      
      if (onSubida) {
        onSubida(urlArchivo);
      }

      // Actualizar previsualización si es foto (usar BASE_URL para archivos estáticos)
      if (esFoto && urlArchivo) {
        setPrevisualizacion(`${BASE_URL}${urlArchivo}`);
      }
    } catch (error) {
      toast.error(error.message || 'Error al subir el archivo');
      setPrevisualizacion(null);
    } finally {
      setSubiendo(false);
      setProgreso(0);
    }
  };

  const eliminarArchivo = async () => {
    if (!esCV) {
      toast.error('Solo se puede eliminar el CV desde aquí');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/perfil/cv`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el archivo');
      }

      toast.success('CV eliminado exitosamente');
      
      if (onSubida) {
        onSubida(null);
      }
    } catch (error) {
      toast.error(error.message || 'Error al eliminar el archivo');
    }
  };

  return (
    <div className="subida-archivo-container">
      {esFoto && (previsualizacion || archivoActual) && (
        <div className="foto-previsualizacion">
          <img 
            src={previsualizacion || `${BASE_URL}${archivoActual}`} 
            alt="Previsualización"
            className="foto-preview-img"
          />
        </div>
      )}

      <div 
        className={`dropzone ${subiendo ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !subiendo && inputFileRef.current?.click()}
      >
        <input 
          ref={inputFileRef}
          type="file"
          accept={acceptAttr(esFoto ? 'images' : 'pdf')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {subiendo ? (
          <div className="upload-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p>{progreso}%</p>
          </div>
        ) : (
          <>
            {esFoto ? <FaImage className="dropzone-icon" /> : <FaFileAlt className="dropzone-icon" />}
            <p className="dropzone-text">
              {esFoto 
                ? 'Arrastra una imagen o haz clic para seleccionar'
                : 'Arrastra un PDF o haz clic para seleccionar'
              }
            </p>
            <p className="dropzone-subtext">
              Máximo {esFoto ? '5MB' : '10MB'} - 
              {esFoto ? ' JPG, PNG, WEBP' : ' PDF'}
            </p>
          </>
        )}
      </div>

      {archivoActual && esCV && (
        <div className="archivo-actual">
          <div className="archivo-info">
            <FaFileAlt />
            <span>CV actual: {archivoActual.split('/').pop()}</span>
          </div>
          
          <div className="archivo-acciones">
            <a 
              href={`${BASE_URL}${archivoActual}`} 
              download
              className="btn-descargar-mini"
            >
              Descargar
            </a>
            
            <button 
              onClick={eliminarArchivo}
              className="btn-eliminar-mini"
            >
              <FaTrash /> Eliminar
            </button>
          </div>
        </div>
      )}

      {esFoto && archivoActual && (
        <p className="texto-ayuda">
          Sube una nueva foto para reemplazar la actual
        </p>
      )}
    </div>
  );
};

export default SubidaArchivo;
