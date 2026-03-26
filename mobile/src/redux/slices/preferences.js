import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tableShape: 'rectangular', // 'rectangular' | 'elliptical'
  autoplay: true,             // auto-play the only legal card (per-player setting)
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setTableShape: (state, action) => {
      state.tableShape = action.payload;
    },
    setAutoplay: (state, action) => {
      state.autoplay = action.payload;
    },
  },
});

export const { setTableShape, setAutoplay } = preferencesSlice.actions;
export default preferencesSlice.reducer;
