import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@services/apiClient'

export interface AuthState {
  isAuthenticated: boolean
  user: any | null
  token: string | null
  refreshToken: string | null
  organizationId: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  organizationId: localStorage.getItem('organizationId'),
  loading: false,
  error: null
}

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password })
      const { token, refreshToken, user, organizationId } = response.data.data

      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('organizationId', organizationId)

      return { token, refreshToken, user, organizationId }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/register', userData)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('organizationId')
    return null
  } catch (error: any) {
    return rejectWithValue('Logout failed')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthState: (state, action: PayloadAction<Partial<AuthState>>) => {
      return { ...state, ...action.payload }
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.user = action.payload.user
        state.organizationId = action.payload.organizationId
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.refreshToken = null
        state.organizationId = null
      })
  }
})

export const { setAuthState, clearError } = authSlice.actions
export default authSlice.reducer
