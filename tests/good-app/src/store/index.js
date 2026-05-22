import { configureStore, createSlice } from '@reduxjs/toolkit';

const themeSlice = createSlice({
  name: 'theme',
  initialState: { bg: '#fff' },
  reducers: {
    setBg: (state, action) => {
      state.bg = action.payload;
    },
  },
});

export const { setBg } = themeSlice.actions;
export const store = configureStore({ reducer: { theme: themeSlice.reducer } });
