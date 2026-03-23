import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tableShape: 'rectangular', // 'rectangular' | 'elliptical'
  stickyInspect: false,       // when true, inspect mode persists across moves
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setTableShape: (state, action) => {
      state.tableShape = action.payload;
    },
    setStickyInspect: (state, action) => {
      state.stickyInspect = action.payload;
    },
  },
});

export const { setTableShape, setStickyInspect } = preferencesSlice.actions;
export default preferencesSlice.reducer;
