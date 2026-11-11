import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/api';

export const RecuperarContra = () => {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      const response = await fetch(`${API_URL}/usuario/recuperar-contrasena`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje('Se ha enviado una nueva contraseña a tu correo electrónico.');
        setEmail('');

        // Redirigir después de 3 segundos
        setTimeout(() => {
          navigate('/iniciarSesion');
        }, 3000);
      } else {
        setError(data.message || 'Error al procesar la solicitud.');
      }
    } catch (err) {
      console.error('Error al recuperar contraseña:', err);
      setError('Error al conectar con el servidor.');
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-800/80 px-4 sm:px-6 py-8 sm:py-12 pt-20 sm:pt-24">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-xl bg-[#12143d] text-[#f0f0f0] rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-[#ffbf30]">
          Recuperar Contraseña
        </h2>
        <p className="text-xs sm:text-sm text-center mb-6 sm:mb-8 text-[#f0f0f0]">
          Ingresa tu correo electrónico y te enviaremos una nueva contraseña si tu cuenta existe.
        </p>

        {mensaje && <div className="text-green-400 text-center font-medium mb-4 text-sm sm:text-base">{mensaje}</div>}
        {error && <div className="text-red-400 text-center font-medium mb-4 text-sm sm:text-base">{error}</div>}

        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm sm:text-base mb-2 text-center">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] border-none text-[#f0f0f0] focus:ring-2 focus:ring-[#5445ff] outline-none text-sm sm:text-base"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#5445ff] hover:bg-[#4032cc] text-white font-semibold rounded-xl py-2.5 sm:py-3 text-base sm:text-lg"
          >
            Enviar nueva contraseña
          </button>
        </form>

        <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-center">
          ¿Recordaste tu contraseña?{' '}
          <a href="/iniciarSesion" className="text-[#ffbf30] font-medium">
            Inicia Sesión
          </a>
        </p>
      </div>
    </div>
  );
};

export default RecuperarContra;
