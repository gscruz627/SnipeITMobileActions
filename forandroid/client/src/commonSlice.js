// src/redux/counterSlice.js
import { createSlice } from '@reduxjs/toolkit';

export const commonSlice = createSlice({
  name: 'common',
  initialState: {
    snipeItKey: null,
    snipeItUrl: null,
    archivedId: 3,
    checkoutId: 11,
    delay: 3,
    leadingOne: false,
    nextAudit: 1
  },
  reducers: {
    setConfiguration: (state, action) => {
        state.snipeItKey = action.payload.snipeItKey
        state.snipeItUrl = action.payload.snipeItUrl
        state.archivedId = action.payload.archivedId
        state.leadingOne = action.payload.leadingOne
        state.checkoutId = action.payload.checkoutId
        state.delay = action.payload.delay
        state.nextAudit = action.payload.nextAudit
    }
  },
});

export const { setConfiguration } = commonSlice.actions;

export default commonSlice.reducer;
