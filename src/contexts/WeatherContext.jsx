import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

const WeatherContext = createContext();

export const useWeather = () => useContext(WeatherContext);

export const WeatherProvider = ({ children }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [isMock, setIsMock] = useState(false);

  const fetchWeather = async (lat, lon, city) => {
    try {
      setLoading(true);
      setError(null);
      let url = `${API_ENDPOINTS.weather}?`;
      if (lat && lon) url += `lat=${lat}&lon=${lon}`;
      else if (city) url += `city=${encodeURIComponent(city)}`;
      else url += `city=New Delhi`; // Default

      const response = await fetch(url);
      const resData = await response.json();
      
      if (resData.success) {
        setWeather(resData.data);
        setIsMock(!!resData.isMock);
      } else {
        setError(resData.error || 'Failed to fetch weather');
      }
    } catch (err) {
      setError('Network error: Could not reach weather service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load: Try geolocation first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lon: longitude });
          fetchWeather(latitude, longitude);
        },
        () => {
          // Fallback if denied
          fetchWeather();
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeather();
    }
  }, []);

  return (
    <WeatherContext.Provider value={{ 
      weather, loading, error, location, isMock, 
      refreshWeather: (lat, lon, city) => fetchWeather(lat, lon, city) 
    }}>
      {children}
    </WeatherContext.Provider>
  );
};
