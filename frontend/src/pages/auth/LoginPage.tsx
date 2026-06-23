import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { login } from '@store/authSlice'
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
  InputAdornment,
  IconButton
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'

const NAVY     = '#0B0F1A'
const NAVY_MID = '#111827'
const NAVY_LT  = '#1E2D40'
const ORANGE   = '#6366F1'
const ORANGE_L = '#818CF8'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector(state => state.auth)

  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.email) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Please enter a valid email'
    if (!formData.password) errors.password = 'Password is required'
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
    if (validationErrors[name]) setValidationErrors({ ...validationErrors, [name]: '' })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const result = await dispatch(login({ email: formData.email, password: formData.password })).unwrap()
      if (result) navigate('/')
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: NAVY,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      // Subtle grid background
      backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(99,102,241,0.08) 0%, transparent 40%)`
    }}>

      {/* Decorative circles */}
      <Box sx={{
        position: 'absolute', top: -100, right: -100,
        width: 400, height: 400, borderRadius: '50%',
        border: `1px solid ${NAVY_LT}`, opacity: 0.4, pointerEvents: 'none'
      }} />
      <Box sx={{
        position: 'absolute', bottom: -150, left: -100,
        width: 500, height: 500, borderRadius: '50%',
        border: `1px solid ${NAVY_LT}`, opacity: 0.3, pointerEvents: 'none'
      }} />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            bgcolor: NAVY_MID,
            border: `1px solid ${NAVY_LT}`,
            borderRadius: 3,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
          }}
        >
          {/* Logo */}
          <Box textAlign="center" mb={4}>
            <Typography
              component="div"
              sx={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 800,
                fontSize: '2rem',
                letterSpacing: '-1px',
                lineHeight: 1,
                color: '#FFFFFF',
                mb: 0.75
              }}
            >
              Hire<Box component="span" sx={{ color: ORANGE }}>IQ</Box>
            </Typography>
            <Box sx={{ width: 40, height: 3, bgcolor: ORANGE, borderRadius: 2, mx: 'auto', mb: 1.5 }} />
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 400 }}>
              Intelligent Recruitment Platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              placeholder="you@company.com"
              margin="normal"
              variant="outlined"
              disabled={loading}
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ fontSize: '1rem', color: '#475569' }} />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: NAVY,
                  '& fieldset': { borderColor: NAVY_LT },
                  '&:hover fieldset': { borderColor: ORANGE },
                  '&.Mui-focused fieldset': { borderColor: ORANGE, borderWidth: 1.5 }
                },
                '& .MuiInputLabel-root.Mui-focused': { color: ORANGE }
              }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              placeholder="Enter your password"
              margin="normal"
              variant="outlined"
              disabled={loading}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: '1rem', color: '#475569' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(v => !v)} edge="end" sx={{ color: '#475569' }}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: NAVY,
                  '& fieldset': { borderColor: NAVY_LT },
                  '&:hover fieldset': { borderColor: ORANGE },
                  '&.Mui-focused fieldset': { borderColor: ORANGE, borderWidth: 1.5 }
                },
                '& .MuiInputLabel-root.Mui-focused': { color: ORANGE }
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={loading}
                  sx={{
                    color: '#475569',
                    '&.Mui-checked': { color: ORANGE }
                  }}
                  size="small"
                />
              }
              label={<Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>Remember me</Typography>}
              sx={{ mt: 0.5, mb: 2.5 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{
                py: 1.4,
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                background: `linear-gradient(135deg, ${ORANGE} 0%, #4338CA 100%)`,
                boxShadow: `0 4px 20px rgba(99,102,241,0.45)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${ORANGE_L} 0%, ${ORANGE} 100%)`,
                  boxShadow: `0 6px 24px rgba(99,102,241,0.6)`
                },
                '&:disabled': { opacity: 0.6 }
              }}
            >
              {loading ? (
                <><CircularProgress size={18} sx={{ mr: 1, color: 'white' }} /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: NAVY_LT }} />
            <Typography variant="caption" sx={{ color: '#475569' }}>OR</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: NAVY_LT }} />
          </Box>

          <Button
            component={Link}
            to="/register"
            fullWidth
            variant="outlined"
            size="large"
            disabled={loading}
            sx={{
              py: 1.4,
              fontWeight: 600,
              borderColor: NAVY_LT,
              color: '#94A3B8',
              '&:hover': { borderColor: ORANGE, color: ORANGE, bgcolor: 'rgba(99,102,241,0.06)' }
            }}
          >
            Create Account
          </Button>

          <Box textAlign="center" sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${NAVY_LT}` }}>
            <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.72rem' }}>
              © 2026 HireIQ — Powered by Bourntec Solutions
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default LoginPage
