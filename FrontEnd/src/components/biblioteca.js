import React, { useState, useCallback, useEffect } from 'react'
import DocumentCard from './documentCard'
import DocumentModal from './documentModal'
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  AiFillFilePdf,
  AiFillFileExcel,
  AiFillFileWord,
  AiFillFilePpt,
  AiFillFileText,
  AiFillFileImage,
  AiFillFileZip,
  AiFillFile,
  AiFillFolder,
} from 'react-icons/ai'
import { IoMdArrowRoundBack } from "react-icons/io"
import { useDropzone } from 'react-dropzone'
import { CheckmarkIcon, toast } from "react-hot-toast"
import { useAuth } from "../components/context/AuthContext"
import { filterValidFiles } from '../utils/fileValidation'
import { API_URL } from '../utils/api'

// Función auxiliar para mapear tipos de archivo
const mapTipoArchivo = (tipo) => {
  const tipoLower = tipo?.toLowerCase() || ''
   if (tipoLower.includes('pdf')) return 'pdf'
  if (tipoLower.includes('excel') || tipoLower.includes('spreadsheet')) return 'excel'
  if (tipoLower.includes('word') || tipoLower.includes('document')) return 'word'
  if (tipoLower.includes('powerpoint') || tipoLower.includes('presentation')) return 'ppt'
  if (tipoLower.includes('text')) return 'text'
  if (tipoLower.includes('image')) return 'img'
  if (tipoLower.includes('zip') || tipoLower.includes('compressed')) return 'zip'
  return 'default'
}


// Campo para renombrar un archivo antes de subirlo (la extensión no es editable)
const FileNameField = ({ value, ext, error, onChange }) => (
  <div className="w-full max-w-md flex flex-col gap-1">
    <label className="text-sm text-gray-600">Nombre del archivo</label>
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={150}
        className={`flex-1 px-3 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 ${error ? 'border-red-500 focus:ring-red-400' : 'focus:ring-blue-500'}`}
      />
      <span className="text-gray-500 text-sm">{ext}</span>
    </div>
    {error && <span className="text-red-600 text-xs">{error}</span>}
  </div>
)

export const Biblioteca = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [ userIsProfesional, setUserIsProfesional ] = useState(false);

  // Estados principales
  const [folderName, setFolderName] = useState(location.state?.folderName || 'Biblioteca');

  useEffect(() => {
      const checkProfesional = async() => {
          try {
              const response = await fetch(`${API_URL}/banco-profesionales/es-profesional/${user._id}`);
              const data = await response.json();
              console.log(data);
              setUserIsProfesional(data.esProfesional);
          } catch (e) {
              console.error("Error al verificar si el usuario pertenece al banco de profesionales:", e);
          }
      };
      if (user?._id){
          checkProfesional();
      } else {
          setUserIsProfesional(false);
      }
  },[user])

  // actualizar el folderName
  useEffect(() => {
    if (location.state?.folderName) {
      setFolderName(location.state.folderName)
    }
  }, [location.state])

  const [selectedDoc, setSelectedDoc] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [documentosFiltrados, setDocumentosFiltrados] = useState([])
  const [nombre, setNombre] = useState('')
  const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [nombreCarpeta, setNombreCarpeta] = useState("")
  // RF023: Estado para controlar archivos ya subidos que se deben ocultar
  const [uploadedFileNames, setUploadedFileNames] = useState(new Set())
  const [categorias, setCategorias] = useState([])
  const [categoriaUpload, setCategoriaUpload] = useState('')
  // Nombres personalizados (sin extensión) por archivo seleccionado
  const [customNames, setCustomNames] = useState({})
  // Archivos seleccionados que ya pasaron la verificación de contenido real (no solo extensión/MIME)
  const [verifiedFiles, setVerifiedFiles] = useState([])
  const [contentRejectedCount, setContentRejectedCount] = useState(0)
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await fetch(`${API_URL}/elements/categoria`)
        const data = await response.json()
        setCategorias((data.data || []).filter(c => c.estado !== false))
      } catch (error) {
        console.error("Error al obtener categorías:", error)
      }
    }
    fetchCategorias()
  }, [])

  // Mapa de iconos para el modal
  const modalIconMap = {
    pdf: <AiFillFilePdf className="text-[#ed1c22] text-7xl" />,
    excel: <AiFillFileExcel className="text-green-500 text-7xl" />,
    word: <AiFillFileWord className="text-blue-500 text-7xl" />,
    ppt: <AiFillFilePpt className="text-orange-500 text-7xl" />,
    text: <AiFillFileText className="text-[#fb544a] text-7xl" />,
    img: <AiFillFileImage className="text-[#fea190] text-7xl" />,
    zip: <AiFillFileZip className="text-[#f8bd3a] text-7xl" />,
    carpeta: <AiFillFolder className="text-[#ffd04c] text-4xl min-w-[32px]" />,
    default: <AiFillFile className="text-gray-400 text-7xl" />,
  }

  // Configuración de dropzone
   // Aumentado a 200MB. Mantener en sync con el servidor (env LIBRARY_MAX_FILE_SIZE_MB)
  const maxSize = 200 * 1024 * 1024 // 200 MB
  const ALLOWED_LIBRARY_ACCEPT = {
    'application/pdf': ['.pdf'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],  // Solo estos, no .jfif, .pjpeg, etc.
    'image/webp': ['.webp'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/x-rar': ['.rar'],
  }
  const ALLOWED_EXTENSIONS = new Set([
    '.pdf', '.xls', '.xlsx', '.doc', '.docx', '.ppt', '.pptx',
    '.txt', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar'
  ])
  
  const getExt = (filename) => {
    return '.' + filename.split('.').pop().toLowerCase()
  }
  const MAX_NAME_LENGTH = 150
  const INVALID_NAME_CHARS = /[\\/:*?"<>|\x00-\x1f]/
  const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified ?? ''}`
  const splitName = (filename) => {
    const i = filename.lastIndexOf('.')
    return i > 0 ? { base: filename.slice(0, i), ext: filename.slice(i) } : { base: filename, ext: '' }
  }
  // Devuelve un mensaje de error o null si el nombre es válido
  const validateBaseName = (base, ext) => {
    const v = base.trim()
    if (!v) return 'El nombre no puede estar vacío'
    if (INVALID_NAME_CHARS.test(v)) return 'No se permiten los caracteres \\ / : * ? " < > |'
    if (v.startsWith('.')) return 'El nombre no puede comenzar con un punto'
    if (v.length + ext.length > MAX_NAME_LENGTH) return `Máximo ${MAX_NAME_LENGTH} caracteres`
    return null
  }
  const {
    fileRejections,
    getRootProps,
    getInputProps,
    isDragActive,
    inputRef, // RF023: Para limpiar los archivos después de subir
  } = useDropzone({
    maxSize,
    accept: ALLOWED_LIBRARY_ACCEPT,
    // Tras el filtro por extensión/MIME/tamaño, se lee el contenido real de cada archivo
    // (firmas, ejecutables disfrazados, macros, zips peligrosos...). Solo los verificados se pueden subir.
    onDrop: async (accepted) => {
      const { valid, rejected } = await filterValidFiles(accepted, 'library')
      setVerifiedFiles(valid)
      setContentRejectedCount(rejected.length)
    },
    validator: (file) => {
      const ext = getExt(file.name)
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return { code: 'file-invalid-type', message: 'Extensión no permitida' }
      }
      return null
    },
    onDropRejected: (fileRejections) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-too-large') {
            toast.error(`El archivo ${file.name} es demasiado grande. Tamaño máximo permitido: 200 MB.`)
          } else if (error.code === 'file-invalid-type') {
            toast.error(`Tipo de archivo no permitido: ${file.name}. Permitidos: PDF, Excel, Word, PPT, TXT, PNG, JPG, WEBP, ZIP y RAR.`)
          } else {
            toast.error(`Error al subir el archivo ${file.name}: ${error.message}`)
          }
        })
      })
    }
  })

  // Función para cargar contenido de la carpeta actual
  const fetchFolderContents = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/biblioteca/list/${id}?orden=asc`)
      const data = await response.json()

      const archivos = (data.contentFile || []).map(file => ({
        nombre: file.nombre,
        autor: file.autor?.nombre || "Desconocido",
        size: `${(file.tamano / (1024 * 1024)).toFixed(2)} MB`,
        tag: mapTipoArchivo(file.tipoArchivo),
        url: file.url,
        id: file._id
      }))

      const carpetas = (data.contentFolder || []).map(folder => ({
        nombre: folder.nombre,
        autor: "",
        size: "",
        tag: "carpeta",
        id: folder._id
      }))

      setDocumentos([...carpetas, ...archivos])
      setDocumentosFiltrados([...carpetas, ...archivos])
    } catch (error) {
      console.error("Error al obtener archivos:", error)
    }
  }, [id])

  // Handlers del modal
  const handleOpenModal = (doc) => setSelectedDoc(doc)
  const handleCloseModal = () => setSelectedDoc(null)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = selectedDoc.url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    handleCloseModal()
  }

  const handleDelete = async () => {
    try {
      if (selectedDoc.tag === 'carpeta') {
        await toast.promise(
          fetch(`${API_URL}/biblioteca/folder/${selectedDoc.id}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
          }).then((res) => {
            if (!res.ok) throw new Error("No se pudo eliminar la carpeta")
            return res.json()
          }),
          {
            loading: "Eliminando carpeta...",
            success: "¡Carpeta eliminada!",
            error: "Error al eliminar la carpeta",
          }
        )
      } else {
        await toast.promise(
          fetch(`${API_URL}/biblioteca/delete/${selectedDoc.id}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
          }).then((res) => {
            if (!res.ok) throw new Error("No se pudo eliminar el archivo")
            return res.json()
          }),
          {
            loading: "Eliminando archivo...",
            success: "¡Archivo eliminado!",
            error: "Error al eliminar el archivo",
          }
        )
      }

      setDocumentos((prevDocs) =>
        prevDocs.filter((doc) => doc.id !== selectedDoc.id)
      )
      setDocumentosFiltrados((prevDocs) =>
        prevDocs.filter((doc) => doc.id !== selectedDoc.id)
      )

      handleCloseModal()
    } catch (error) {
      console.error("Error al eliminar:", error)
    }
  }

  const handleNavigation = () => {
    handleCloseModal()
    if (selectedDoc?.id && selectedDoc?.nombre) {
      sessionStorage.setItem(`bibFolderName:${selectedDoc.id}`, selectedDoc.nombre)
    }
    navigate(`/biblioteca/${selectedDoc.id}`)
  }

  const handleOpenFolder = (docId, docName) => {
    handleCloseModal()
    if (docId && docName) {
      sessionStorage.setItem(`bibFolderName:${docId}`, docName)
      setFolderName(docName)
    }
    navigate(`/biblioteca/${docId}`, { state: { folderName: docName } })
  }

  // Subir archivos
  const handleOnSubmit = async (e) => {
    e.preventDefault()

    if (!categoriaUpload) {
      toast.error('Debes seleccionar una categoría antes de subir los archivos.')
      return
    }

    // Validar los nombres antes de enviar
    const nombres = []
    for (const archivo of verifiedFiles) {
      const { base, ext } = splitName(archivo.name)
      const chosen = customNames[fileKey(archivo)] ?? base
      const err = validateBaseName(chosen, ext)
      if (err) {
        toast.error(`${archivo.name}: ${err}`)
        return
      }
      nombres.push(chosen.trim())
    }

    const data = new FormData()
    verifiedFiles.forEach((archivo) => {
      data.append("archivos", archivo)
    })
    data.append("nombres", JSON.stringify(nombres))
    data.append("userId", user._id)
    data.append("userType", user.tipoUsuario) // RF023: Enviar tipo de usuario
    data.append("folderId", id)
    data.append("categoriaId", categoriaUpload)

    // Ejecutar la petición y usar toast.promise para el estado de la operación.
    const result = await toast.promise(
      (async () => {
        const response = await fetch(`${API_URL}/biblioteca/upload/`, {
          method: 'POST',
          body: data,
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        });

        // Manejo explícito de errores comunes
        if (response.status === 413) {
          let body = null;
          try { body = await response.json(); } catch (_) { /* ignore */ }
          throw new Error(body?.message || 'El archivo excede el límite permitido en el servidor (413).');
        }

        if (!response.ok) {
          let body = null;
          try { body = await response.json(); } catch (_) { /* ignore */ }
          throw new Error(body?.message || `Error al subir archivos (status ${response.status}).`);
        }

        return response.json();
      })(),
      {
        loading: 'Subiendo archivos...',
        success: (data) => {
          // RF023: Marcar archivos como subidos para ocultarlos de la UI
          const newUploadedNames = new Set(uploadedFileNames);
          verifiedFiles.forEach(file => newUploadedNames.add(file.name));
          setUploadedFileNames(newUploadedNames);
          
          // Limpiar input
          if (inputRef.current) {
            inputRef.current.value = '';
          }
          // RF023: Mostrar el mensaje que viene del backend
          return data.message || 'Archivos subidos correctamente';
        },
        error: (err) => {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('NetworkError') || msg.includes('Failed to fetch') || msg.includes('ECONNRESET')) {
            return 'Error de conexión durante la carga. Verifica tu conexión e inténtalo de nuevo.'
          }
          // Mensaje genérico para errores de subida
          return msg.includes('archivo') || msg.includes('Archivo')
            ? `Error al subir el archivo: ${msg}`
            : `Error al subir el archivo: ${msg}`
        },
        duration: 8000,
      }
    )

    // Procesar errores individuales si los hay
    try {
      if (result && Array.isArray(result.results)) {
        const failed = result.results.filter(r => !r.success);
        
        if (failed.length > 0) {
          failed.forEach(f => {
            toast.error(`Error: ${f.nombre || 'archivo'} - ${f.message || 'Error desconocido'}`);
          });
        }
      }
    } catch (e) {
      console.error('Error procesando respuesta de subida:', e);
    }

    fetchFolderContents()
  }

  // Búsqueda
  const publicoParam = (user?.tipoUsuario === 0 || user?.tipoUsuario === 1) ? '' : '&publico=true'
  
  const handleSearch = useCallback(async () => {
    const q = nombre.trim()
    if (q === '' && !categoriaFiltro) return
    const qLower = q.toLowerCase()

    try {
      const params = new URLSearchParams({ global: 'true', orden: 'asc' })
      if (q) params.set('nombre', q)
      if (categoriaFiltro) params.set('categoria', categoriaFiltro)
      const respuesta = await fetch(
        `${API_URL}/biblioteca/list/0?${params.toString()}${publicoParam}`
      )
      const data = await respuesta.json()

      const archivos = (data.contentFile || []).map(file => ({
        nombre: file.nombre,
        autor: file.autor?.nombre || "Desconocido",
        size: `${(file.tamano / (1024 * 1024)).toFixed(2)} MB`,
        tag: mapTipoArchivo(file.tipoArchivo),
        url: file.url,
        id: file._id
      }))

      const carpetas = (data.contentFolder || []).map(folder => ({
        nombre: folder.nombre,
        autor: "",
        size: "",
        tag: "carpeta",
        id: folder._id
      }))

      const todos = [...carpetas, ...archivos]
      const filtradosPorPrefijo = qLower
        ? todos.filter(doc => doc.nombre.toLowerCase().startsWith(qLower))
        : todos
      setDocumentos(filtradosPorPrefijo)
      setDocumentosFiltrados(filtradosPorPrefijo)
    } catch (error) {
      console.error("Error al obtener archivos:", error)
    }
  }, [nombre, categoriaFiltro, publicoParam])

  // Crear carpeta
  const handleCrearCarpeta = async () => {
    if (!nombreCarpeta.trim()) return
    
    await toast.promise(
      fetch(`${API_URL}/biblioteca/folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          nombre: nombreCarpeta,
          parent: id,
        }),
      }).then(async (response) => {
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.message || "Error al crear la carpeta")
        }
        return result
      }),
      {
        loading: "Creando carpeta...",
        success: "Carpeta creada con éxito 🎉",
        error: (err) => `Error: ${err.message}`,
        duration: 8000,
      }
    )

    if (id && id !== '0') {
      sessionStorage.setItem(`bibFolderName:${id}`, folderName)
    }
    setNombreCarpeta("")
    setMostrarModal(false)
    fetchFolderContents()
  }

  const handleFiltroChange = (e) => {
    setEtiquetaSeleccionada(e.target.value)
  }

  const mostrarBotonVolver = () => {
    return location.pathname !== '/biblioteca'
  }

  // Renderizar archivos aceptados (RF023: filtrar los que ya fueron subidos)
  const files = verifiedFiles
    .filter(file => !uploadedFileNames.has(file.name))
    .map(file => (
    <div
      key={fileKey(file)}
      className='flex flex-wrap justify-center gap-4 w-full max-w-6xl p-4'
    >
      <FileNameField
        ext={splitName(file.name).ext}
        value={customNames[fileKey(file)] ?? splitName(file.name).base}
        error={validateBaseName(customNames[fileKey(file)] ?? splitName(file.name).base, splitName(file.name).ext)}
        onChange={(v) => setCustomNames(prev => ({ ...prev, [fileKey(file)]: v }))}
      />
      <DocumentCard
        name={customNames[fileKey(file)] !== undefined ? customNames[fileKey(file)].trim() + splitName(file.name).ext : file.name}
        author={user?.nombre || "Anónimo"}
        size={`${(file.size / (1024 * 1024)).toFixed(2)} MB`}
        type={file.type}
      />
    </div>
  ))

  // RF023: Resetear el Set cuando verifiedFiles cambie (nueva selección)
  useEffect(() => {
    // Cuando el usuario selecciona archivos (nuevos o los mismos), limpiar el Set
    setUploadedFileNames(new Set());
    setCustomNames({});
  }, [verifiedFiles])

  // Effect: Búsqueda con debounce
  useEffect(() => {
    const q = nombre.trim()
    if (q === '' && !categoriaFiltro) {
      fetchFolderContents()
      return
    }

    const delayDebounce = setTimeout(() => {
      handleSearch()
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [nombre, categoriaFiltro, handleSearch, fetchFolderContents])

  // Effect: Cargar contenido inicial
  useEffect(() => {
    fetchFolderContents()
  }, [fetchFolderContents])

  // Effect: Restaurar nombre de carpeta desde sessionStorage
  useEffect(() => {
    if (id && id !== '0') {
      const savedName = sessionStorage.getItem(`bibFolderName:${id}`)
      if (savedName) {
        setFolderName(savedName)
      }
    }
  }, [id])

  // Effect: Filtrado combinado por nombre y etiqueta
  useEffect(() => {
    let filtrados = documentos
    const q = nombre.trim().toLowerCase()
    
    if (q !== "") {
      filtrados = filtrados.filter(doc => 
        doc.nombre.toLowerCase().startsWith(q)
      )
    }
    
    if (etiquetaSeleccionada !== "") {
      filtrados = filtrados.filter(doc => 
        doc.tag.toLowerCase() === etiquetaSeleccionada
      )
    }
    
    setDocumentosFiltrados(filtrados)
  }, [nombre, etiquetaSeleccionada, documentos])


  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isMoveActive, setIsMoveActive] = useState(false);
  
  const toggleFileSelection = (doc) =>{
    setSelectedFiles(prev => {
	    const exists = prev.some(f => f.id === doc.id);
    	if (exists) {
	      return prev.filter(f => f.id !== doc.id);
    	} else {
	      return [...prev, doc];
  	  }
    });
  }

  /*Llamada al backedn para mover archivos de carpetas y carpetas*/
  const handleMoveFiles = async (e) => {
    e.preventDefault()

    if (selectedFiles.length === 0) {
      toast.error("Selecciona archivos y una carpeta destino")
      return
    }

    const folders = selectedFiles.filter(f => f.tag === "carpeta");
    const files = selectedFiles.filter((item) => {return item.tag !== "carpeta"})

    let result;

    if (files.length !== 0) {
      const payload = {
        fileIds: files.map(f => f.id),
        targetFolderId: id,
        userId: user._id,
        userType: user.tipoUsuario,
      }

      result = await toast.promise(
        (async () => {
          const response = await fetch(`${API_URL}/biblioteca/move`, {
            method: 'PUT',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            let body = null
            try { body = await response.json() } catch (_) {}
            throw new Error(body?.message || `Error al mover archivos (${response.status})`)
          }

          return response.json()
        })(),
    
        {
          loading: 'Moviendo archivos...',
          success: (data) => {
            setSelectedFiles([])
            fetchFolderContents()
            return data.message || 'Archivos movidos correctamente'
          },
          error: (err) => {
            const msg = err instanceof Error ? err.message : String(err)
            return msg.includes('Network')
              ? 'Error de conexión al mover archivos'
              : `Error al mover archivos: ${msg}`
          },
          duration: 8000,
        }
      )
    }

    if (folders.length !== 0){
      const payload2 = {
        folderIds: folders.map(f => f.id),
        targetFolderId: id,
        userId: user._id,
        userType: user.tipoUsuario,
      }

      const result2 = await toast.promise(
        (async () => {
          const response = await fetch(`${API_URL}/biblioteca/folder/move`, {
            method: 'PUT',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(payload2),
          })

          if (!response.ok){
            let body = null;
            try {body = await response.json() } catch (_) {}
            throw new Error(body?.message || `Error al mover carpetas (${response.status})`);
          }

          return response.json();
        })(),
        {
          loading: 'Moviendo carpetas...',
          success: (data) => {
            setSelectedFiles([])
            fetchFolderContents()
            return data.message || 'Carpetas movidas correctamente'
          },
          error: (err) => {
            const msg = err instanceof Error ? err.message : String(err)
            return msg.includes('Network')
              ? 'Error de conexión al mover carpetas'
              : `Error al mover carpetas: ${msg}`
          },
          duration: 8000,
        }
      )
    }
    try {
      if (result && Array.isArray(result.results)) {
        const failed = result.results.filter(r => !r.success)

        failed.forEach(f => {
          toast.error(`Error: ${f.nombre} - ${f.message}`)
        })
      }
    } catch (e) {
      console.error("Error procesando move:", e)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-800/80 pt-16 min-h-screen p-4 sm:p-8">
      {/* Título */}
      <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
        <span className="text-gray-200">Biblioteca</span>
      </h1>


      {/* Nombre de carpeta actual */}
      <p className="text-xl text-white font-semibold flex items-center gap-2">
        <AiFillFolder className="text-[#ffd04c] text-2xl" />
        {folderName}
      </p>

      {/* Zona de subida (RF023: usuarios básicos/premium pueden subir a cualquier carpeta) */}
      {user && (user.tipoUsuario === 0 || user.tipoUsuario === 1 || user.tipoUsuario === 2 || user.tipoUsuario === 3) && userIsProfesional && (
        <div className="flex flex-wrap justify-center gap-4 w-full max-w-6xl p-4">
          {/* RF023: Mensaje informativo para usuarios básicos/premium */}
          {(user.tipoUsuario === 2 || user.tipoUsuario === 3) && (
            <div className="w-full bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg mb-4">
              <p className="font-medium">ℹ️ Información importante:</p>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Tus archivos serán enviados y quedarán pendientes de aprobación.</li>
                <li>Deberás solicitar a un administrador que los publique.</li>
                <li>Puedes subir archivos a cualquier carpeta.</li>
                <li>No puedes crear nuevas carpetas (solo admin/super-admin).</li>
              </ul>
            </div>
          )}
          
          <div
            {...getRootProps()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-xl p-8 text-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-50"
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Suelta los archivos aquí ...</p>
            ) : (
              <p className="text-gray-600">
                Arrastra y suelta algunos archivos aquí, o{' '}
                <span className="text-blue-600 underline">haz clic para seleccionarlos</span>
              </p>
            )}
          </div>

          {(fileRejections.length > 0 || contentRejectedCount > 0) && (
            <div className="mt-4 text-red-600">
              {(() => {
                const n = fileRejections.length + contentRejectedCount
                return n === 1 ? 'Un archivo fue rechazado' : `${n} archivos fueron rechazados`
              })()}:
              {' '}formato no permitido (solo PDF, Excel, Word, PPT, TXT, PNG, JPG, WEBP, ZIP y RAR), contenido que no coincide con la extensión o tamaño superior a 200 MB.
            </div>
          )}

          {verifiedFiles.length !== 0 && (
            <div className="w-full max-w-6xl px-4 mt-6 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <select
                  value={categoriaUpload}
                  onChange={(e) => setCategoriaUpload(e.target.value)}
                  required
                  className="w-full md:w-64 px-4 py-2 border rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona una categoría *</option>
                  {categorias.map(c => (
                    <option key={c._id} value={c._id}>{c.nombre}</option>
                  ))}
                </select>
                <button
                  onClick={handleOnSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Subir
                </button>
              </div>
              <div>{files}</div>
            </div>
          )}
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap justify-center gap-4 w-full max-w-6xl p-4 text-black">
        <form className="flex flex-col md:flex-row gap-2 md:items-center w-full">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="w-full md:w-auto flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 shadow-sm"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <select
            value={etiquetaSeleccionada}
            onChange={handleFiltroChange}
            className="w-full md:w-48 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los archivos</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="word">Word</option>
            <option value="ppt">PPT</option>
            <option value="text">TXT</option>
            <option value="img">IMG</option>
            <option value="zip">ZIP</option>
          </select>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => (
              <option key={c._id} value={c._id}>{c.nombre}</option>
            ))}
          </select>
          <button
            className="w-full focus:ring focus:outline md:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            onClick={(e) => { 
              e.preventDefault()
              handleSearch()
            }}
          >
            Buscar
          </button>
        </form>
      </div>


  {user && (user.tipoUsuario === 0 || user.tipoUsuario === 1) && (
  <div className="flex flex-col gap-2">
  <div className="flex flex-row justify-start px-3 gap-4">
              <button
                onClick={() => setMostrarModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium p-3 rounded-lg shadow flex gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-plus-icon lucide-folder-plus">
                  <path d="M12 10v6"/><path d="M9 13h6"/><path 
                  d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                </svg>
                Crear carpeta
              </button>

              {mostrarModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      Nueva carpeta
                    </h3>
                    <input
                      type="text"
                      value={nombreCarpeta}
                      onChange={(e) => setNombreCarpeta(e.target.value)}
                      placeholder="Nombre de la carpeta"
                      className="w-full px-4 py-2 mb-4 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setMostrarModal(false)}
                        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCrearCarpeta}
                        className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        Crear
                      </button>
                    </div>
                  </div>
                </div>
              )}

    <button 
      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium p-3 rounded-lg shadow flex gap-2"
      onClick={() => {if(isMoveActive) {setSelectedFiles([])} setIsMoveActive(!isMoveActive)}}
    > 
      {!isMoveActive ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-input-icon lucide-folder-input">
          <path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"/>
          <path d="M2 13h10"/><path d="m9 16 3-3-3-3"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-minus-icon lucide-copy-minus">
          <line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path 
          d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      )}
      {isMoveActive ? ("Cancelar") : ("Mover archivos")}
    </button>
    
    {isMoveActive && (
      <div>
        <button
          onClick={handleMoveFiles}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium p-3 rounded-lg shadow flex gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-check-icon lucide-folder-check">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="m9 13 2 2 4-4"/>
          </svg>
          Mover aquí
        </button>
      </div>
    )}
  </div>

  {isMoveActive && (
    <div>
      <div className="bg-white shadow-md rounded-xl p-4 w-full max-w-md border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
        📂 Archivos seleccionados
        </label>

        <div className="flex flex-wrap gap-2">
          {selectedFiles.map(file => (
            <div
              key={file.id}
              className="flex items-center bg-gray-100 hover:bg-gray-200 transition px-3 py-1.5 rounded-full text-sm text-gray-700 max-w-full"
            >
              <span className="truncate max-w-[120px]">
                {file.nombre}
              </span>
            </div>
          ))}
        </div>

      {selectedFiles.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center mt-2">
          No hay archivos seleccionados
        </p>
      )}
      </div>
    </div>
  )}
  </div>
  )}

      {/* Grid de documentos */}
      <div className="w-full max-w-6xl bg-white/10 rounded-xl p-4">
        <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
            {documentosFiltrados.map((doc) => (
              <DocumentCard
                key={doc.id}
                name={doc.nombre}
                author={doc.autor}
                size={doc.size}
                type={doc.tag}
                onClick={() => {
                  if (doc.tag === 'carpeta') {
                    handleOpenFolder(doc.id, doc.nombre)
                  } else {
                    handleOpenModal(doc)
                  }
                }}
		            onContextMenu={(e) => {
          		    e.preventDefault();
          		    if(doc.tag === 'carpeta'){
              			handleOpenModal(doc)
          		    }
            		}}
      	        isChecked={selectedFiles.some(f => f.id === doc.id)}
            		onCheck={() => toggleFileSelection(doc)}
                checkVisible={isMoveActive}
                />
              ))}
          </div>
      </div>
        
        {/* Contador */}
        <div className="mt-2 text-center text-white text-sm">
          Mostrando {documentosFiltrados.length} {documentosFiltrados.length === 1 ? 'elemento' : 'elementos'}
        </div>
      </div>

      {/* Modal de documento */}
      <DocumentModal
        isOpen={!!selectedDoc}
        name={selectedDoc?.nombre}
        size={selectedDoc?.size}
        author={selectedDoc?.autor}
        icon={modalIconMap[selectedDoc?.tag] || modalIconMap.default}
        tag={selectedDoc?.tag}
        onClose={handleCloseModal}
        onRedirect={handleNavigation}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </div>
  )
}

export default Biblioteca
