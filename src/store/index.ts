import { configureStore } from "@reduxjs/toolkit";
import appReducer from "./appSlice";

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});

/** Kiểu của toàn bộ state trong store. */
export type RootState = ReturnType<typeof store.getState>;
/** Kiểu của hàm `dispatch` của store. */
export type AppDispatch = typeof store.dispatch;
