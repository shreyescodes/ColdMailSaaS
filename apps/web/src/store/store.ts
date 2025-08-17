import { configureStore } from '@reduxjs/toolkit';
import campaignsReducer from './slices/campaignsSlice';
import contactsReducer from './slices/contactsSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    campaigns: campaignsReducer,
    contacts: contactsReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
