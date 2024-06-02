import { applyMiddleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit'
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import alert from './slices/alert';

const initialState = {test : 'tester'};

const store = configureStore({
  reducer: {
    alert: alert
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
});

export default store;