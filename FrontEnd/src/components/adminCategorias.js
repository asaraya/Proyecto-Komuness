// components/adminCategorias.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/api";
import { useAuth } from "./context/AuthContext";
import { toast } from "react-hot-toast";
import "../CSS/adminCategorias.css"; // Importamos el CSS separado
import { IoMdArrowRoundBack } from "react-icons/io";

export const AdminCategorias = () => {
  const TYPES = {
    categoria: {
      label: "Categoría",
      plural: "Categorías",
    },
    etiqueta: {
      label: "Etiqueta",
      plural: "Etiquetas",
    },
  };

  const [optionActive, setOptionActive] = useState("categoria");
  const currentType = TYPES[optionActive];

  const setOption = (option) => {
    setEditingId(null);
    setFormData({ nombre: "" });
    setOptionActive(option);
  };

  useEffect(() => {
    fetchElements();
  }, [optionActive]);

  const [elements, setElements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: "" });
  const { user, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPermissions = async () => {
      // Esperar a que AuthContext valide la sesión antes de decidir.
      if (cargando) return;

      if (!user) {
        navigate("/iniciarSesion");
        return;
      }

      if (user.tipoUsuario !== 0 && user.tipoUsuario !== 1) {
        toast.error("No tienes permisos para acceder a esta sección");
        navigate("/");
        return;
      }
    };

    checkPermissions();
  }, [user, cargando, navigate]);

  const fetchElements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/elements/${optionActive}`);
      if (!response.ok) throw new Error("Error al cargar " + optionActive);

      const data = await response.json();
      setElements(data.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar " + optionActive);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    if (!formData.nombre.trim()) {
      toast.error(
        `El nombre de la ${currentType.label.toLowerCase()} es obligatorio`,
      );
      setActionLoading(false);
      return;
    }

    try {
      const url = editingId
        ? `${API_URL}/elements/${optionActive}/${editingId}`
        : `${API_URL}/elements/${optionActive}`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingId
            ? `${currentType.label} actualizada`
            : `${currentType.label} creada`,
        );
        setFormData({ nombre: "" });
        setEditingId(null);
        fetchElements();
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message || "Error al guardar las " + optionActive,
        );
      }
    } catch (error) {
      toast.error("Error al guardar las " + optionActive);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar esta ${currentType.label.toLowerCase()}?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/elements/${optionActive}/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        toast.success(`${currentType.label} eliminada`);
        fetchElements();
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message ||
            `Error al eliminar la ${currentType.label.toLowerCase()}`,
        );
      }
    } catch (error) {
      toast.error(`Error al eliminar la ${currentType.label.toLowerCase()}`);
    }
  };
  const handleToggle = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/elements/${optionActive}/toggle/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        toast.success("Estado actualizado");
        fetchElements();
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  const handleGoBack = () => {
    navigate("/perfilUsuario"); // Vuelve al dashboard administrativo
  };

  if (loading) {
    return (
      <div className="admin-categorias-loading">
        <div className="text-white">
          {`Cargando ${currentType.label.toLowerCase()}...`}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-categorias-container">
      <div className="admin-categorias-content">
        <div className="admin-categorias-header">
          <button
            onClick={handleGoBack}
            className="admin-categorias-back-btn"
            title="Volver al perfil"
            aria-label="Volver al perfil"
          >
            <IoMdArrowRoundBack size={22} />
          </button>
          <h1 className="admin-categorias-title">
            Administración de Clasificaciones
          </h1>
          <div className="admin-categorias-header-spacer" aria-hidden="true" />
        </div>

        {/*opciones*/}
        <div className="admin-categorias-options">
          <button
            onClick={() => setOption("categoria")}
            className={`admin-categorias-option-btn ${
              optionActive === "categoria" ? "active" : ""
            }`}
          >
            Categorías
          </button>

          <button
            onClick={() => setOption("etiqueta")}
            className={`admin-categorias-option-btn ${
              optionActive === "etiqueta" ? "active" : ""
            }`}
          >
            Etiquetas
          </button>
        </div>

        {/* Formulario */}
        <div className="admin-categorias-form-container">
          <h2 className="admin-categorias-subtitle">
            {editingId
              ? `Editar ${currentType.label}`
              : `Crear Nueva ${currentType.label}`}
          </h2>

          <form onSubmit={handleSubmit} className="admin-categorias-form">
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ nombre: e.target.value })}
              placeholder={`Nombre de la ${currentType.label.toLowerCase()}`}
              className="admin-categorias-input"
              required
              disabled={actionLoading}
            />
            <div className="admin-categorias-form-buttons">
              <button
                type="submit"
                className="admin-categorias-submit-btn"
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Procesando..."
                  : editingId
                    ? "Actualizar"
                    : "Crear"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ nombre: "" });
                    setEditingId(null);
                  }}
                  className="admin-categorias-cancel-btn"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de categorías */}
        <div className="admin-categorias-table-container">
          <div className="admin-categorias-table-wrapper">
            <table className="admin-categorias-table">
              <thead className="admin-categorias-table-header">
                <tr>
                  <th className="admin-categorias-th">Nombre</th>
                  <th className="admin-categorias-th">Estado</th>
                  <th className="admin-categorias-th">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {elements.map((element, index) => (
                  <tr
                    key={element._id}
                    className={`admin-categorias-tr ${index % 2 === 0 ? "admin-categorias-tr-even" : "admin-categorias-tr-odd"}`}
                  >
                    <td className="admin-categorias-td admin-categorias-td-name">
                      {element.nombre.toUpperCase()}
                    </td>
                    <td className="admin-categorias-td">
                      <span
                        className={`admin-categorias-status ${element.estado ? "admin-categorias-status-active" : "admin-categorias-status-inactive"}`}
                      >
                        {element.estado ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="admin-categorias-td">
                      <div className="admin-categorias-actions">
                        <button
                          onClick={() => {
                            setFormData({ nombre: element.nombre });
                            setEditingId(element._id);
                          }}
                          className="admin-categorias-edit-btn"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggle(element._id)}
                          className="admin-categorias-delete-btn"
                        >
                          {element.estado ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {elements.length === 0 && (
            <div className="admin-categorias-empty">
              No hay elementos registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategorias;
