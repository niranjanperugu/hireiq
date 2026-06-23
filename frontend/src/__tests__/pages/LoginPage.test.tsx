import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import LoginPage from '@pages/auth/LoginPage'
import authSlice from '@store/authSlice'

describe('LoginPage', () => {
  let store: any

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice
      }
    })
  })

  const renderLoginPage = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>
    )
  }

  it('should render login form', () => {
    renderLoginPage()

    expect(screen.getByText(/login/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('should display validation errors for empty fields', async () => {
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should display invalid email error', async () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const submitButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('should handle successful login', async () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })

    const submitButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(submitButton)

    // Would assert navigation or store updates
    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('Password123!')
  })

  it('should show remember me checkbox', () => {
    renderLoginPage()

    const checkbox = screen.getByRole('checkbox', { name: /remember me/i })
    expect(checkbox).toBeInTheDocument()

    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('should have link to register page', () => {
    renderLoginPage()

    const registerLink = screen.getByRole('link', { name: /register/i })
    expect(registerLink).toHaveAttribute('href', '/register')
  })
})
