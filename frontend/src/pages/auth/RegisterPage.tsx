import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { register } from '@store/authSlice'
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  LinearProgress
} from '@mui/material'
import { styled } from '@mui/material/styles'

const StyledContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5',
  py: 4
}))

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(1),
  width: '100%',
  maxWidth: 480,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 24px rgba(0, 0, 0, 0.5)'
    : '0 8px 24px rgba(0, 0, 0, 0.15)'
}))

interface RegisterFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector(state => state.auth)

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 12.5
    if (/[!@#$%^&*]/.test(password)) strength += 12.5
    return Math.min(strength, 100)
  }

  const passwordStrength = calculatePasswordStrength(formData.password)

  const getPasswordStrengthColor = (): 'error' | 'warning' | 'success' => {
    if (passwordStrength < 40) return 'error'
    if (passwordStrength < 70) return 'warning'
    return 'success'
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      })
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await dispatch(
        register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        })
      ).unwrap()

      navigate('/login', { state: { message: 'Registration successful! Please log in.' } })
    } catch (err) {
      console.error('Registration failed:', err)
    }
  }

  return (
    <StyledContainer maxWidth="sm">
      <StyledPaper>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            HireIQ
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Create Your Account
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Register Form */}
        <Box component="form" onSubmit={handleRegister}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
            <TextField
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              error={!!validationErrors.firstName}
              helperText={validationErrors.firstName}
              disabled={loading}
              variant="outlined"
              size="small"
            />

            <TextField
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              error={!!validationErrors.lastName}
              helperText={validationErrors.lastName}
              disabled={loading}
              variant="outlined"
              size="small"
            />
          </Box>

          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            placeholder="you@example.com"
            margin="normal"
            variant="outlined"
            disabled={loading}
            autoComplete="email"
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            error={!!validationErrors.password}
            helperText={validationErrors.password || 'At least 8 characters with uppercase, lowercase, number'}
            placeholder="Create a strong password"
            margin="normal"
            variant="outlined"
            disabled={loading}
            autoComplete="new-password"
          />

          {/* Password Strength Indicator */}
          {formData.password && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="textSecondary">
                  Password Strength
                </Typography>
                <Typography variant="caption" color={getPasswordStrengthColor() === 'success' ? 'success.main' : getPasswordStrengthColor() === 'warning' ? 'warning.main' : 'error.main'}>
                  {passwordStrength < 40 ? 'Weak' : passwordStrength < 70 ? 'Fair' : 'Strong'}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={passwordStrength}
                color={getPasswordStrengthColor()}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>
          )}

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
            placeholder="Confirm your password"
            margin="normal"
            variant="outlined"
            disabled={loading}
            autoComplete="new-password"
          />

          <FormControlLabel
            control={
              <Checkbox
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                disabled={loading}
              />
            }
            label={
              <Typography variant="body2">
                I agree to the{' '}
                <Box component="span" sx={{ color: 'primary.main', textDecoration: 'underline' }}>
                  Terms and Conditions
                </Box>
              </Typography>
            }
            sx={{ mt: 2, mb: 3 }}
          />

          {validationErrors.agreeToTerms && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationErrors.agreeToTerms}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            type="submit"
            disabled={loading}
            sx={{ py: 1.5, mb: 2, fontWeight: 600 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </Box>

        {/* Divider */}
        <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
          <Typography variant="body2" color="textSecondary">
            OR
          </Typography>
          <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
        </Box>

        {/* Sign In Link */}
        <Box textAlign="center">
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Already have an account?
          </Typography>
          <Button
            component={Link}
            to="/login"
            fullWidth
            variant="outlined"
            size="large"
            disabled={loading}
            sx={{ py: 1.5, fontWeight: 600 }}
          >
            Sign In
          </Button>
        </Box>
      </StyledPaper>
    </StyledContainer>
  )
}

export default RegisterPage
