import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/fuenteKomuness.css';
import { useAuth } from '../components/context/AuthContext';
import { API_URL } from '../utils/api';

export const InitForm = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');
  const [confirmacionMensaje, setConfirmacionMensaje] = useState('');
  const [mostrarReenviarConfirmacion, setMostrarReenviarConfirmacion] = useState(false);
  const [reenviandoConfirmacion, setReenviandoConfirmacion] = useState(false);
  const [reenvioMensaje, setReenvioMensaje] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const confirmacion = params.get('confirmacion');
    const mensaje = params.get('mensaje');

    if (confirmacion === 'ok') {
      setConfirmacionMensaje(
        mensaje || 'Cuenta confirmada exitosamente. Ya puedes iniciar sesión.'
      );
      setErrorMensaje('');
      return;
    }

    if (confirmacion === 'error') {
      setErrorMensaje(mensaje || 'No se pudo confirmar la cuenta.');
      setConfirmacionMensaje('');
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMensaje('');
    setReenvioMensaje('');
    setMostrarReenviarConfirmacion(false);

    try {
      const response = await fetch(API_URL + '/usuario/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        const userData = { ...data.user };
        delete userData.password;

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', userData._id);

        login(userData, data.token);
        navigate('/');
      } else {
        if (data.code === 'EMAIL_NOT_CONFIRMED') {
          setMostrarReenviarConfirmacion(true);
        }
        console.error('Error en login:', data.message || 'Error desconocido');
        setErrorMensaje(data.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      setErrorMensaje('Ocurrió un error al conectar con el servidor');
    }
  };

  const handleReenviarConfirmacion = async () => {
    const emailLimpio = String(email || '').trim().toLowerCase();

    if (!emailLimpio) {
      setErrorMensaje('Ingresa tu correo para reenviar el mensaje de confirmación.');
      return;
    }

    setReenviandoConfirmacion(true);
    setErrorMensaje('');
    setReenvioMensaje('');

    try {
      const response = await fetch(API_URL + '/usuario/reenviar-confirmacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailLimpio })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMensaje(data.message || 'No se pudo reenviar el correo de confirmación.');
        return;
      }

      setReenvioMensaje(
        data.message || 'Correo de confirmación reenviado. Revisa tu bandeja de entrada.'
      );
    } catch (error) {
      console.error('Error reenviando confirmación:', error);
      setErrorMensaje('Ocurrió un error al reenviar el correo de confirmación.');
    } finally {
      setReenviandoConfirmacion(false);
    }
  };

  const toggleMostrarContrasena = () => {
    setMostrarContrasena(!mostrarContrasena);
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-800/80 px-4 sm:px-6 py-8 sm:py-12 pt-20 sm:pt-24">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-xl bg-[#12143d] text-[#f0f0f0] rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-[#ffbf30]">
          ¡Bienvenido(a)!
        </h2>

        {confirmacionMensaje && (
          <div className="mb-4 text-green-400 text-center font-semibold text-sm sm:text-base">
            {confirmacionMensaje}
          </div>
        )}

        {errorMensaje && (
          <div className="mb-4 text-red-400 text-center font-semibold text-sm sm:text-base">
            {errorMensaje}
          </div>
        )}

        {mostrarReenviarConfirmacion && (
          <div className="mb-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleReenviarConfirmacion}
              disabled={reenviandoConfirmacion || !String(email || '').trim()}
              className="px-4 py-2 rounded-lg bg-[#ffbf30] text-[#12143d] font-semibold disabled:opacity-60"
            >
              {reenviandoConfirmacion ? 'Enviando...' : 'Reenviar correo de confirmación'}
            </button>
            <p className="text-xs sm:text-sm text-[#c9c9d6] text-center">
              Si no recibiste el correo, puedes enviarlo nuevamente.
            </p>
          </div>
        )}

        {reenvioMensaje && (
          <div className="mb-4 text-green-400 text-center font-semibold text-sm sm:text-base">
            {reenvioMensaje}
          </div>
        )}

        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm sm:text-base mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] border-none text-[#f0f0f0] focus:ring-2 focus:ring-[#5445ff] outline-none text-sm sm:text-base"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm sm:text-base mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={mostrarContrasena ? 'text' : 'password'}
                placeholder="****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] border-none text-[#f0f0f0] focus:ring-2 focus:ring-[#5445ff] outline-none pr-12 text-sm sm:text-base"
                required
              />
              <button
                type="button"
                onClick={toggleMostrarContrasena}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-[#ffbf30] outline-none focus:outline-none"
              >
                {mostrarContrasena ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <div className="text-right mt-2">
              <a href="/recuperar" className="text-xs sm:text-sm text-[#ffbf30] hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#5445ff] hover:bg-[#4032cc] text-white font-semibold rounded-xl py-2.5 sm:py-3 text-base sm:text-lg"
          >
            Iniciar Sesión
          </button>
        </form>

        <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-center">
          ¿No tienes cuenta?{' '}
          <a href="/crearUsr" className="text-[#ffbf30] font-medium">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
};

export default InitForm;
