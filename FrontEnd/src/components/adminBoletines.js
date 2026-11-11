import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/api";
import { useAuth } from "./context/AuthContext";
import { toast } from "react-hot-toast";
import "../CSS/adminBoletines.css";
import { IoMdArrowRoundBack, IoMdCreate, IoMdTrash } from "react-icons/io";
import { MdSend } from "react-icons/md";

export const AdminBoletines = () => {
    const navigate = useNavigate();
    const { user, token, cargando } = useAuth();

    const [boletines, setBoletines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUsuarios, setSelectedUsuarios] = useState([]);

    const [formData, setFormData] = useState({
        titulo: "",
        contenido: "",
        descripcion: "",
        destinatarios: {
            tipo: "todos",
            usuariosIds: [],
            roles: []
        }
    });

    // Verificar permisos
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

    // Obtener boletines
    const fetchBoletines = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/boletines`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Error al obtener boletines");

            const data = await response.json();
            setBoletines(data.data || []);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Obtener usuarios
    const fetchUsuarios = async () => {
        try {
            const response = await fetch(`${API_URL}/usuario`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Error al obtener usuarios");

            const data = await response.json();
            // El endpoint retorna el array directamente o dentro de data
            setUsuarios(Array.isArray(data) ? data : (data.data || []));
        } catch (error) {
            console.error("Error fetching users:", error);
            setUsuarios([]);
        }
    };

    useEffect(() => {
        if (token) {
            fetchBoletines();
            fetchUsuarios();
        } else {
            setLoading(false);
        }
    }, [token]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDestinatariosChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            destinatarios: {
                ...prev.destinatarios,
                [name]: value
            }
        }));
    };

    const handleUsuarioToggle = (usuarioId) => {
        setSelectedUsuarios(prev =>
            prev.includes(usuarioId)
                ? prev.filter(id => id !== usuarioId)
                : [...prev, usuarioId]
        );
    };

    const handleRoleToggle = (role) => {
        setFormData(prev => ({
            ...prev,
            destinatarios: {
                ...prev.destinatarios,
                roles: prev.destinatarios.roles.includes(role)
                    ? prev.destinatarios.roles.filter(r => r !== role)
                    : [...prev.destinatarios.roles, role]
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.titulo.trim() || !formData.contenido.trim()) {
            toast.error("Título y contenido son obligatorios");
            return;
        }

        try {
            setActionLoading(true);

            const data = {
                ...formData,
                destinatarios: {
                    ...formData.destinatarios,
                    usuariosIds: selectedUsuarios
                }
            };

            const url = editingId
                ? `${API_URL}/boletines/${editingId}`
                : `${API_URL}/boletines`;

            const method = editingId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error("Error al guardar boletín");

            toast.success(editingId ? "Boletín actualizado" : "Boletín creado");
            setShowForm(false);
            setEditingId(null);
            setFormData({
                titulo: "",
                contenido: "",
                descripcion: "",
                destinatarios: {
                    tipo: "todos",
                    usuariosIds: [],
                    roles: []
                }
            });
            setSelectedUsuarios([]);
            fetchBoletines();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = (boletin) => {
        setEditingId(boletin._id);
        setFormData({
            titulo: boletin.titulo,
            contenido: boletin.contenido,
            descripcion: boletin.descripcion,
            destinatarios: boletin.destinatarios
        });
        setSelectedUsuarios(boletin.destinatarios.usuariosIds || []);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este boletín?")) return;

        try {
            setActionLoading(true);
            const response = await fetch(`${API_URL}/boletines/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Error al eliminar");

            toast.success("Boletín eliminado");
            fetchBoletines();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEnviar = async (id) => {
        if (!window.confirm("¿Enviar este boletín a todos los destinatarios?")) return;

        try {
            setActionLoading(true);
            const response = await fetch(`${API_URL}/boletines/${id}/enviar`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Error al enviar boletín");

            const result = await response.json();
            toast.success(`Boletín enviado a ${result.data.enviados} usuarios`);
            fetchBoletines();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getEstadoBadge = (estado) => {
        const badges = {
            borrador: "badge-borrador",
            programado: "badge-programado",
            enviado: "badge-enviado",
            cancelado: "badge-cancelado"
        };
        return badges[estado] || "badge-default";
    };

    const getEstadoText = (estado) => {
        const texts = {
            borrador: "Borrador",
            programado: "Programado",
            enviado: "Enviado",
            cancelado: "Cancelado"
        };
        return texts[estado] || estado;
    };

    return (
        <div className="admin-boletines-container">
            <div className="admin-boletines-header">
                <button onClick={() => navigate("/perfilUsuario")} className="btn-back">
                    <IoMdArrowRoundBack /> Volver
                </button>
                <h1>Gestión de Boletines</h1>
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingId(null);
                        setFormData({
                            titulo: "",
                            contenido: "",
                            descripcion: "",
                            destinatarios: {
                                tipo: "todos",
                                usuariosIds: [],
                                roles: []
                            }
                        });
                        setSelectedUsuarios([]);
                    }}
                    className="btn-create"
                >
                    {showForm ? "Cancelar" : "Crear Boletín"}
                </button>
            </div>

            {showForm && (
                <div className="boletin-form-container">
                    <h2>{editingId ? "Editar Boletín" : "Crear Nuevo Boletín"}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="titulo">Título *</label>
                            <input
                                type="text"
                                id="titulo"
                                name="titulo"
                                value={formData.titulo}
                                onChange={handleInputChange}
                                required
                                placeholder="Título del boletín"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="descripcion">Descripción</label>
                            <input
                                type="text"
                                id="descripcion"
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleInputChange}
                                placeholder="Descripción breve"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contenido">Contenido *</label>
                            <textarea
                                id="contenido"
                                name="contenido"
                                value={formData.contenido}
                                onChange={handleInputChange}
                                required
                                placeholder="Contenido del boletín (HTML permitido)"
                                rows="6"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="tipo">Tipo de Destinatarios</label>
                            <select
                                id="tipo"
                                name="tipo"
                                value={formData.destinatarios.tipo}
                                onChange={handleDestinatariosChange}
                            >
                                <option value="todos">Todos los usuarios</option>
                                <option value="seleccionados">Usuarios seleccionados</option>
                                <option value="rol">Por rol</option>
                            </select>
                        </div>

                        {formData.destinatarios.tipo === "seleccionados" && (
                            <div className="form-group">
                                <label>Seleccionar Usuarios</label>
                                <div className="usuarios-list">
                                    {usuarios.map(usuario => (
                                        <div key={usuario._id} className="usuario-item">
                                            <input
                                                type="checkbox"
                                                id={`user-${usuario._id}`}
                                                checked={selectedUsuarios.includes(usuario._id)}
                                                onChange={() => handleUsuarioToggle(usuario._id)}
                                            />
                                            <label htmlFor={`user-${usuario._id}`}>
                                                {usuario.nombre} {usuario.apellido} ({usuario.email})
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.destinatarios.tipo === "rol" && (
                            <div className="form-group">
                                <label>Seleccionar Roles</label>
                                <div className="roles-list">
                                    <div className="role-item">
                                        <input
                                            type="checkbox"
                                            id="role-2"
                                            checked={formData.destinatarios.roles.includes(2)}
                                            onChange={() => handleRoleToggle(2)}
                                        />
                                        <label htmlFor="role-2">Usuarios Básicos</label>
                                    </div>
                                    <div className="role-item">
                                        <input
                                            type="checkbox"
                                            id="role-3"
                                            checked={formData.destinatarios.roles.includes(3)}
                                            onChange={() => handleRoleToggle(3)}
                                        />
                                        <label htmlFor="role-3">Usuarios Premium</label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn-submit" disabled={actionLoading}>
                            {actionLoading ? "Guardando..." : "Guardar Boletín"}
                        </button>
                    </form>
                </div>
            )}

            <div className="boletines-list">
                <h2>Boletines</h2>
                {loading ? (
                    <p className="loading">Cargando...</p>
                ) : boletines.length === 0 ? (
                    <p className="empty-state">No hay boletines creados</p>
                ) : (
                    <div className="boletines-table-wrapper">
                    <table className="boletines-table">
                        <thead>
                            <tr>
                                <th>Título</th>
                                <th>Estado</th>
                                <th>Destinatarios</th>
                                <th>Enviados/Total</th>
                                <th>Fecha Creación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {boletines.map(boletin => (
                                <tr key={boletin._id}>
                                    <td>{boletin.titulo}</td>
                                    <td>
                                        <span className={`estado-badge ${getEstadoBadge(boletin.estado)}`}>
                                            {getEstadoText(boletin.estado)}
                                        </span>
                                    </td>
                                    <td>{boletin.destinatarios.tipo}</td>
                                    <td>
                                        {boletin.estado === "enviado"
                                            ? `${boletin.enviados || 0}/${boletin.totalUsuarios || 0}`
                                            : "-"}
                                    </td>
                                    <td>
                                        {new Date(boletin.fechaCreacion).toLocaleDateString()}
                                    </td>
                                    <td className="acciones">
                                        {boletin.estado === "borrador" && (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(boletin)}
                                                    className="btn-action btn-edit"
                                                    title="Editar"
                                                >
                                                    <IoMdCreate />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(boletin._id)}
                                                    className="btn-action btn-delete"
                                                    title="Eliminar"
                                                    disabled={actionLoading}
                                                >
                                                    <IoMdTrash />
                                                </button>
                                                <button
                                                    onClick={() => handleEnviar(boletin._id)}
                                                    className="btn-action btn-send"
                                                    title="Enviar"
                                                    disabled={actionLoading}
                                                >
                                                    <MdSend />
                                                </button>
                                            </>
                                        )}
                                        {boletin.estado === "enviado" && (
                                            <span className="sent-label">Enviado</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBoletines;
