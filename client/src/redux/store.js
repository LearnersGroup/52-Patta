import { applyMiddleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit'
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import alert from './slices/alert';
import game from './slices/game';

const initialState = {test : 'tester'};

const store = configureStore({
  reducer: {
    alert: alert,
    game: game
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
});

export default store;