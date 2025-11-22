
import { useState } from 'react';

interface Location {
  latitude: number;
  longitude: number;
}

const useGeolocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = (callback?: (position: GeolocationPosition) => void | Promise<void>) => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setLoading(true);
    setError(null);

    const options = {
      enableHighAccuracy: true, // Force GPS use
      timeout: 15000,          // 15s timeout for GPS lock
      maximumAge: 0            // No caching
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        
        if (callback) {
          try {
            await Promise.resolve(callback(position));
          } catch (e: any) {
             setError(`Erro no callback de geolocalização: ${e.message}`);
          }
        }
        setLoading(false);
      },
      (err) => {
        let msg = "Erro desconhecido.";
        switch(err.code) {
            case err.PERMISSION_DENIED: msg = "Permissão negada pelo usuário. Ative a localização nas configurações do celular."; break;
            case err.POSITION_UNAVAILABLE: msg = "Sinal de GPS indisponível. Vá para uma área aberta."; break;
            case err.TIMEOUT: msg = "O tempo para obter a localização esgotou."; break;
        }
        setError(msg);
        setLoading(false);
        alert(msg);
      },
      options
    );
  };

  return { location, loading, error, getLocation };
};

export default useGeolocation;
