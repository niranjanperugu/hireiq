import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import candidatesReducer from './candidatesSlice'
import jobsReducer from './jobsSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    candidates: candidatesReducer,
    jobs: jobsReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
