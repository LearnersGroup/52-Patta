import { configureStore } from '@reduxjs/toolkit'
import alert from './slices/alert';
import game from './slices/game';
import preferences from './slices/preferences';

const store = configureStore({
  reducer: {
    alert: alert,
    game: game,
    preferences: preferences,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
});

export default store;
