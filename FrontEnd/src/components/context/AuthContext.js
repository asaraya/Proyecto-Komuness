import { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '../../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const validarToken = async () => {
      const localToken = localStorage.getItem('token');
      const localUser = localStorage.getItem('user');
      if (localUser) {
        try {
          const response = await fetch(API_URL + '/usuario/check',
            {
              headers: {
                Authorization: `Bearer ${localToken}`
              }
            });
          //si la respuesta es diferente de 200
          if (!response.ok) {
            logout();
            setCargando(false);
            return;
          }
          const data = await response.json();
          const userData = data.user || JSON.parse(localUser);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } catch (error) {
          logout();
          setCargando(false);
          return;
        }
      }
      setCargando(false);
    }
    validarToken();


    // const localUser = localStorage.getItem('user');
    // setCargando(false);
  }, []);

  // Esta función sincroniza `localStorage` y `setUser`
  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  const token = localStorage.getItem('token');
  return { ...context, token };
}
