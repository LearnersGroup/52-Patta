// src/hooks/useLocalStorage.jsx

import { useState } from "react";

export const useLocalStorage = (keyName, defaultValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const value = window.localStorage.getItem(keyName);
      if (value) {
        return JSON.parse(value);
      } else {
        window.localStorage.setItem(keyName, JSON.stringify(defaultValue));
        return defaultValue;
      }
    } catch (err) {
      return defaultValue;
    }
  });
  const setValue = (newValue) => {
    try {
      setStoredValue((previousValue) => {
        const valueToStore =
          newValue instanceof Function ? newValue(previousValue) : newValue;
        window.localStorage.setItem(keyName, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (err) {
      console.log(err);
    }
  };
  return [storedValue, setValue];
};