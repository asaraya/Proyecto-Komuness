import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { API_URL } from "../utils/api";
import EncuestaInicioFields from "./EncuestaInicioFields";
import {
  createEmptySurvey,
  normalizeSurveyPayload,
} from "../utils/onboardingSurvey";

export const CrearUsuario = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmarContraseña: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [encuestaInicio, setEncuestaInicio] = useState(createEmptySurvey);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { nombre, apellido, email, password, confirmarContraseña } = formData;

    if (!nombre || !apellido || !email || !password || !confirmarContraseña) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    if (password !== confirmarContraseña) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos y condiciones");
      return;
    }

    const usuarioFinal = {
      nombre,
      apellido,
      email,
      password,
      codigo: "0",
      tipoUsuario: 2,
      encuestaInicio: normalizeSurveyPayload(encuestaInicio),
    };

    try {
      const response = await fetch(`${API_URL}/usuario/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usuarioFinal),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error del servidor:", data);
        toast.error(`Error: ${data.message || "No se pudo registrar el usuario"}`);
        return;
      }

      toast.success("Usuario registrado con éxito");
      navigate("/iniciarSesion");
    } catch (error) {
      console.error("Error en la solicitud:", error);
      toast.error("Error de red o conexión con el servidor");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800/80 px-4 sm:px-6 py-16 sm:py-20">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-xl bg-[#12143d] text-[#f0f0f0] rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-center text-[#ffbf30]">Crear Cuenta</h2>
        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm sm:text-base mb-1">Nombre</label>
            <input
              name="nombre"
              type="text"
              placeholder="Tu nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] text-[#f0f0f0] text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base mb-1">Apellidos</label>
            <input
              name="apellido"
              type="text"
              placeholder="Tus apellidos"
              value={formData.apellido}
              onChange={handleChange}
              required
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] text-[#f0f0f0] text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base mb-1">Correo Electrónico</label>
            <input
              name="email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] text-[#f0f0f0] text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Contraseña"
                className="w-full px-4 sm:px-5 py-2.5 sm:py-3 pr-12 rounded-xl bg-[#404270] text-[#f0f0f0] text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 sm:top-3 text-white text-sm"
              >
                👁️
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm sm:text-base mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmarContraseña"
                value={formData.confirmarContraseña}
                onChange={handleChange}
                required
                placeholder="Confirmar Contraseña"
                className="w-full px-4 sm:px-5 py-2.5 sm:py-3 pr-12 rounded-xl bg-[#404270] text-[#f0f0f0] text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 sm:top-3 text-white text-sm"
              >
                👁️
              </button>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <input
              id="acepta-terminos"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#ffbf30]"
            />
            <label htmlFor="acepta-terminos" className="text-[#f0f0f0]">
              Acepto los{" "}
              <a href="/terminos-y-condiciones" className="text-[#ffbf30] font-medium">
                Términos y Condiciones
              </a>
            </label>
          </div>
          <EncuestaInicioFields
            value={encuestaInicio}
            onChange={setEncuestaInicio}
          />
          <button
            type="submit"
            disabled={!acceptedTerms}
            className="w-full bg-[#ffbf30] text-[#12141a] font-bold rounded-xl py-2.5 sm:py-3 text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Registrarse
          </button>
        </form>
        <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-center">
          Al crear tu usuario aceptas nuestros{" "}
          <a href="/terminos-y-condiciones" className="text-[#ffbf30] font-medium">
            Términos y Condiciones
          </a>
        </p>
        <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-center">
          ¿Ya tienes cuenta?{" "}
          <a href="/iniciarSesion" className="text-[#ffbf30] font-medium">
            Inicia Sesión
          </a>
        </p>
      </div>
    </div>
  );
};

export default CrearUsuario;
