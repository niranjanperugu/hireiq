import { describe, it, expect, beforeEach } from 'vitest'
import authSlice, { setToken, setUser, logout, setLoading, setError } from '@store/authSlice'

describe('authSlice', () => {
  const initialState = {
    token: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    organizationId: null
  }

  it('should return initial state', () => {
    const state = authSlice(undefined, { type: 'unknown' })
    expect(state).toEqual(initialState)
  })

  it('should set token', () => {
    const token = 'test-jwt-token'
    const state = authSlice(initialState, setToken(token))

    expect(state.token).toBe(token)
  })

  it('should set user and authentication status', () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN'
    }

    const state = authSlice(initialState, setUser(user))

    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should logout and clear state', () => {
    const stateWithAuth = {
      ...initialState,
      token: 'some-token',
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true
    }

    const state = authSlice(stateWithAuth, logout())

    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set loading state', () => {
    const state = authSlice(initialState, setLoading(true))
    expect(state.loading).toBe(true)

    const state2 = authSlice(state, setLoading(false))
    expect(state2.loading).toBe(false)
  })

  it('should set error message', () => {
    const error = 'Authentication failed'
    const state = authSlice(initialState, setError(error))

    expect(state.error).toBe(error)
  })

  it('should clear error when setting token', () => {
    const stateWithError = {
      ...initialState,
      error: 'Some error'
    }

    const state = authSlice(stateWithError, setToken('valid-token'))

    expect(state.token).toBe('valid-token')
    expect(state.error).toBeNull()
  })
})
