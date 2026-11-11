import { useState, useRef } from "react";
import { API_URL } from '../utils/api';


function ComentarioInput({
    value,
    onChange,
    onSubmit,
    onCancel
  }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    onCancel: (v: string) => void;
  }) {
  return (
    <div className="mt-4 w-full flex flex-col sm:flex-row sm:items-start gap-2">
      <div className="flex flex-col gap-1 w-full">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe una respuesta..."
          className="flex-1 p-2 rounded-lg bg-gray-900 text-white border border-gray-600 resize-none"
        />
      </div>
      
      <div className="flex flex-col gap-2 px-3">
      <button
        onClick={onSubmit}
        className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Comentar
      </button>
      <button
        onClick={(e) => onCancel(null)}
        className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Cancelar
      </button>
      </div>
    </div>
  );
}



const ComentariosPub = ({ comentarios, setComentarios, publicacionId }) => {
  const [nuevoComentario, setNuevoComentario] = useState("");

  // Obtener el usuario desde localStorage
  const usuarioLogueado = JSON.parse(localStorage.getItem("user"));

  const agregarComentario = () => {
    if (!nuevoComentario.trim()) return;

    const comentario = {
      autor: {
        id: usuarioLogueado._id,
        nombre: usuarioLogueado.nombre,
        apellido: usuarioLogueado.apellido,
        avatar: usuarioLogueado.avatar || "https://i.pravatar.cc/40",
      },
      contenido: nuevoComentario,
      fecha: new Date().toLocaleDateString("es-ES"),
    };

    //setComentarios([comentario, ...comentarios]);
    setNuevoComentario("");
    enviarComentario(comentario);
  };

  const enviarComentario = async (comentario) => {
    try {
      const res = await fetch(
        `${API_URL}/publicaciones/${publicacionId}/comentarios`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(comentario),
        }
      );

      if (!res.ok) {
        console.error("Error al agregar comentario");
      }

      const data = await res.json();

      setComentarios(data);

    } catch (err) {
      console.error("Error en la solicitud:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarComentario();
    }
  };
  const textareaRef = useRef(null);

  const [replyTo, setReplyTo] = useState(null);
  const [comentarioActivo, setComentarioActivo] = useState(null);
  const [respuesta, setRespuesta] = useState("");


  const agregarRespuesta = () => {
    if (!respuesta.trim()) return;

    const nuevaRespuesta = {
      contenido: respuesta,
      replyTo: {
        _id: replyTo._id,
        nombre: replyTo.autor.nombre,
        apellido: replyTo.autor.apellido,
      }
    };

    //setComentarios([comentario, ...comentarios]);
    //setNuevoComentario("");
    enviarRespuesta(nuevaRespuesta);
  };


  const enviarRespuesta = async (respuesta) => {
    try {
      const res = await fetch(
        `${API_URL}/publicaciones/${publicacionId}/comentarios/${comentarioActivo}/respuesta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(respuesta),
        }
      )
      if (!res.ok){
        console.error("Error al agregar respuesta");
      }

      const data = await res.json();

      setComentarios(data);
      setRespuesta("");
      setReplyTo(null);

    } catch (err) {
      console.error("Error en la solicitud:", err);
    }
  }
  
  
  return (
    <div className="mt-6 p-4 bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-white">Comentarios</h3>
      
      {replyTo && (
      <div>
        <h2>Respondiendo a {replyTo.autor.nombre}</h2>
      </div>
      )}

      {/* Caja de comentario solo si el usuario está logueado */}
      {usuarioLogueado && (
        <div className="mt-4 w-full flex flex-col sm:flex-row sm:items-start gap-2">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-start gap-2">

              <textarea
                ref={textareaRef}
                value={nuevoComentario}
                onChange={(e) => {
                  setNuevoComentario(e.target.value);
                  const textarea = e.target;
                  textarea.style.height = "auto";
                  textarea.style.height = `${textarea.scrollHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un comentario..."
                className="flex-1 p-2 rounded-lg bg-gray-900 text-white border border-gray-600 resize-none min-h-[40px] max-h-40 overflow-y-auto"
                rows={1}
                maxLength={500}
              />
            </div>
            <p className="text-right text-xs text-gray-400">
              {nuevoComentario.length}/500 caracteres
            </p>
          </div>

          <button
            onClick={agregarComentario}
            className="self-end sm:self-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Comentar
          </button>
        </div>


      )}

      {/* Lista de comentarios */}
      <div className="mt-4 space-y-4 w-full">
        {comentarios.length === 0 ? (
          <p className="text-gray-400">No hay comentarios aún.</p>
        ) : (
          comentarios.map((comentario) => (
            <div key={comentario._id} className="space-y-2">
              {/*Comentario Nivel 1*/}
              <div className="flex items-start space-x-2 bg-gray-700 p-3 rounded-lg md:flex">
                <div className="w-full">
                  <p className="text-sm text-gray-300 font-semibold">
                    {comentario.autor.nombre ? comentario.autor.nombre : comentario.autor}{" "}
                    <span className="text-xs text-gray-400">
                      • {
                        new Date(comentario.fecha).toLocaleString("es-CR", {
                        dateStyle: "medium",
                        timeStyle: "short"
                        })
                      }
                    </span>
                  </p>
                  <p className="text-white break-words">{comentario.contenido}</p>  
                </div>
                <button 
                  className="ml-auto px-2 py-1 bg-gray-800 hover:bg-zinc-900 hover:text-gray-100 rounded-lg text-gray-400"
                  onClick={() => {setReplyTo(comentario); setComentarioActivo(comentario._id)}}
                >
                  Responder
                </button>
              </div>

              {/*Input para responder*/}
              {replyTo && (replyTo._id === comentario._id) && (
              <div className="flex">
                
                <ComentarioInput
                  value={respuesta}
                  onChange={setRespuesta}
                  onSubmit={agregarRespuesta}
                  onCancel={setReplyTo}
                />

              </div>
              )}
              
              {/* Respuestas */}
              {comentario?.respuestas?.length > 0 && (
                comentario.respuestas.map((respuestaObj) => (
                  <div>
                  <div
                    key={respuestaObj?._id}
                    className="flex items-start space-x-2 ml-8 bg-gray-600 p-3 rounded-lg"
                  >
                    <div className="w-full">
                      <p className="text-sm text-gray-300 font-semibold">
                        {respuestaObj.autor.nombre}{" "}
                        <span className="text-xs text-gray-400">
                        • {
                            new Date(respuestaObj.fecha).toLocaleString("es-CR", {
                            dateStyle: "medium",
                            timeStyle: "short"
                            })
                          }
                        </span>
                      </p>
                      <p className="text-white break-words">
                        @{respuestaObj.replyTo.nombre} {respuestaObj.contenido}
                      </p>
                  </div>
                  <button 
                    className="ml-auto px-2 py-1 bg-gray-800 hover:bg-zinc-900 hover:text-gray-100 rounded-lg text-gray-400"
                    onClick={() => {setReplyTo(respuestaObj); setComentarioActivo(comentario._id)}}
                  >
                    Responder
                  </button>

                </div>
                {/*Input para responder*/}
              {replyTo && (replyTo._id === respuestaObj._id) && (
              <div className="flex">
                
                <ComentarioInput
                  value={respuesta}
                  onChange={setRespuesta}
                  onSubmit={agregarRespuesta}
                  onCancel={setReplyTo}
                />

              </div>
              )}

                </div>
              ))
            )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ComentariosPub;
