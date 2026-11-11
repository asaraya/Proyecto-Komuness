// Cambios en src/components/Footer.js
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFacebook,
  FaInstagram,
  FaEnvelope,
  FaHeart,
  FaPhone,
  FaWhatsapp,
} from "react-icons/fa";
import "../CSS/footer.css";

const Footer = () => {
  const navigate = useNavigate();

  const handlePhoneClick = () => {
    window.open("tel:+50685690514");
  };

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/50685690514");
  };

  const handleNavigation = (path) => {
    navigate(path);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="footer-grid grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="footer-section text-center md:text-left">
            <h3 className="text-xl font-bold text-yellow-500 mb-4">Komuness</h3>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Transformando vidas a través del arte, la educación y la
              cooperación.
            </p>
            <button
              onClick={() => handleNavigation("/acerca-de")}
              className="footer-link inline-flex items-center text-yellow-500 hover:text-yellow-400 font-medium transition-colors group"
            >
              Conoce más sobre nosotros
              <span className="ml-1 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          </div>

          <div className="footer-section text-center">
            <h4 className="text-lg font-semibold mb-4 text-white">
              Enlaces Rápidos
            </h4>
            <ul className="space-y-3 flex flex-col items-center md:items-start">
              <li>
                <button
                  onClick={() => handleNavigation("/publicaciones")}
                  className="footer-link text-gray-300 hover:text-white transition-colors duration-200 inline-block"
                >
                  Publicaciones
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation("/eventos")}
                  className="footer-link text-gray-300 hover:text-white transition-colors duration-200 inline-block"
                >
                  Cartelera de Eventos
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation("/emprendimientos")}
                  className="footer-link text-gray-300 hover:text-white transition-colors duration-200 inline-block"
                >
                  Emprendimientos
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-section text-center md:text-left">
            <h4 className="text-lg font-semibold mb-4 text-white">
              Contáctanos
            </h4>
            <div className="footer-contact space-y-3 text-gray-300">
              <div className="flex justify-center md:justify-start items-center space-x-2">
                <FaEnvelope className="text-red-400 flex-shrink-0" size={16} />
                <a
                  href="mailto:komunesscr@gmail.com"
                  className="hover:text-white transition-colors duration-200 break-all"
                >
                  komunesscr@gmail.com
                </a>
              </div>

              <div className="flex flex-col space-y-2 items-center md:items-start">
                <div className="flex justify-center md:justify-start items-center space-x-2">
                  <FaPhone className="text-green-400 flex-shrink-0" size={16} />
                  <button
                    onClick={handlePhoneClick}
                    className="contact-button hover:text-white transition-colors duration-200 text-left"
                  >
                    (506) 8569-0514
                  </button>
                </div>

                <button
                  onClick={handleWhatsAppClick}
                  className="contact-button bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center space-x-2 w-fit"
                >
                  <FaWhatsapp size={14} />
                  <span>Escribir por WhatsApp</span>
                </button>
              </div>

              <div className="flex justify-center md:justify-start space-x-4 pt-2">
                <a
                  href="https://www.facebook.com/komuness"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors duration-200 p-2 rounded-full hover:bg-gray-800"
                  aria-label="Facebook"
                >
                  <FaFacebook size={20} />
                </a>
                <a
                  href="https://www.instagram.com/komunesscr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-400 transition-colors duration-200 p-2 rounded-full hover:bg-gray-800"
                  aria-label="Instagram"
                >
                  <FaInstagram size={20} />
                </a>
                <a
                  href="mailto:komunesscr@gmail.com"
                  className="hover:text-red-400 transition-colors duration-200 p-2 rounded-full hover:bg-gray-800"
                  aria-label="Email"
                >
                  <FaEnvelope size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <div className="legal-links mb-3">
            <button
              onClick={() => handleNavigation("/tutoriales")}
              className="footer-link legal-link text-gray-300 hover:text-white transition-colors duration-200"
            >
              Tutoriales
            </button>
          </div>

          <div className="legal-links mb-3">
            <button
              onClick={() => handleNavigation("/terminos-y-condiciones")}
              className="footer-link legal-link text-gray-300 hover:text-white transition-colors duration-200"
            >
              Términos y condiciones
            </button>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <span>Hecho con</span>
            <FaHeart className="text-red-500" />
            <span>por Coopesinergia R.L.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
