import { configureStore } from '@reduxjs/toolkit'
import alert from './slices/alert';
import game from './slices/game';

const store = configureStore({
  reducer: {
    alert: alert,
    game: game
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
});

export default store;
