import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Trạng thái chung của ứng dụng: giao diện sáng/tối và thông tin người dùng hiện tại. */
interface AppState {
  theme: "light" | "dark";
  user: Record<string, unknown> | null;
}

const initialState: AppState = {
  theme: "light",
  user: null,
};

export const appSlice = createSlice({
  /** Slice Redux `app` quản lý theme và người dùng. */
  name: "app",
  initialState,
  reducers: {
    /** Đổi giao diện sáng hoặc tối. */
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    /** Lưu thông tin người dùng hiện tại (hoặc `null` khi đăng xuất). */
    setUser: (state, action: PayloadAction<Record<string, unknown> | null>) => {
      state.user = action.payload;
    },
  },
});

export const { setTheme, setUser } = appSlice.actions;
export default appSlice.reducer;
