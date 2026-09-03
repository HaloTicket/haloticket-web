import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  theme: "light" | "dark";
  user: any | null;
}

const initialState: AppState = {
  theme: "light",
  user: null,
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
    },
  },
});

export const { setTheme, setUser } = appSlice.actions;
export default appSlice.reducer;
