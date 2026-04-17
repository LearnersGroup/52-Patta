import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  autoplay: true, // auto-play the only legal card (per-player setting)
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setAutoplay: (state, action) => {
      state.autoplay = action.payload;
    },
  },
});

export const { setAutoplay } = preferencesSlice.actions;
export default preferencesSlice.reducer;
