import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@hooks/redux'
import { login } from '@store/authSlice'
import {
  TextField, Button, Box, Typography, Alert,
  CircularProgress, FormControlLabel, Checkbox,
  InputAdornment, IconButton
} from '@mui/material'
import {
  Visibility, VisibilityOff, Email, Lock,
  AutoAwesome, Speed, Security, Groups
} from '@mui/icons-material'

const INDIGO = '#6366F1'
const INDIGO_D = '#4338CA'

const features = [
  { icon: <AutoAwesome sx={{ fontSize: '1.1rem' }} />, label: 'AI-Powered ATS Scoring', sub: 'Rank candidates automatically with ML' },
  { icon: <Speed sx={{ fontSize: '1.1rem' }} />,        label: 'Real-Time Pipeline',     sub: 'Track every stage of the hiring funnel' },
  { icon: <Groups sx={{ fontSize: '1.1rem' }} />,       label: 'Collaborative Hiring',   sub: 'Panel feedback in one shared workspace' },
  { icon: <Security sx={{ fontSize: '1.1rem' }} />,     label: 'Enterprise Security',    sub: 'JWT auth, role-based access control' },
]

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector(state => state.auth)

  const [formData, setFormData]           = useState({ email: '', password: '', rememberMe: false })
  const [showPassword, setShowPassword]   = useState(false)
  const [validationErrors, setValidation] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email'
    if (!formData.password) e.password = 'Password is required'
    else if (formData.password.length < 6) e.password = 'At least 6 characters'
    setValidation(e)
    return Object.keys(e).length === 0
  }

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = ev.target
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    if (validationErrors[name]) setValidation(p => ({ ...p, [name]: '' }))
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    try {
      const result = await dispatch(login({ email: formData.email, password: formData.password })).unwrap()
      if (result) navigate('/')
    } catch {}
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#FAFAFA',
      borderRadius: 1.5,
      fontSize: '0.9rem',
      '& fieldset': { borderColor: '#E2E8F0' },
      '&:hover fieldset': { borderColor: '#94A3B8' },
      '&.Mui-focused fieldset': { borderColor: INDIGO, borderWidth: 1.5 }
    },
    '& .MuiInputLabel-root': { fontSize: '0.88rem', color: '#64748B' },
    '& .MuiInputLabel-root.Mui-focused': { color: INDIGO },
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '48%',
        minHeight: '100vh',
        background: `linear-gradient(145deg, #0B0F1A 0%, #1a1f35 40%, #111827 100%)`,
        px: 6, py: 5,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background blobs */}
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -120, left: -80, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '42%', left: '55%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px', color: '#fff', lineHeight: 1 }}>
            Hire<Box component="span" sx={{ color: INDIGO }}>IQ</Box>
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#475569', mt: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Intelligent Recruitment
          </Typography>
        </Box>

        {/* Hero content */}
        <Box sx={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 6 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 5, px: 1.5, py: 0.5, mb: 3, width: 'fit-content' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E' }} />
            <Typography sx={{ fontSize: '0.72rem', color: '#818CF8', fontWeight: 600, letterSpacing: '0.04em' }}>ENTERPRISE ATS PLATFORM</Typography>
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: '2.5rem', color: '#fff', lineHeight: 1.15, letterSpacing: '-0.5px', mb: 2 }}>
            Hire smarter,<br />
            <Box component="span" sx={{ background: `linear-gradient(90deg, ${INDIGO} 0%, #818CF8 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              not harder.
            </Box>
          </Typography>

          <Typography sx={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.7, mb: 5, maxWidth: 380 }}>
            From sourcing to offer letter — manage your entire recruitment pipeline with AI-driven insights.
          </Typography>

          {/* Feature list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {features.map(f => (
              <Box key={f.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#818CF8' }}>
                  {f.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#E2E8F0' }}>{f.label}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748B', mt: 0.2 }}>{f.sub}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Bottom stats */}
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', gap: 4, borderTop: '1px solid rgba(255,255,255,0.06)', pt: 3 }}>
          {[['10K+', 'Candidates'], ['98%', 'Uptime'], ['3x', 'Faster Hiring']].map(([val, lab]) => (
            <Box key={lab}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#fff' }}>{val}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#475569', mt: 0.25 }}>{lab}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Right panel (form) ─────────────────────────────────────────── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2.5, sm: 6, lg: 10 },
        py: 5,
        bgcolor: '#fff',
        minHeight: '100vh',
      }}>
        {/* Mobile logo */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: '#0B0F1A' }}>
            Hire<Box component="span" sx={{ color: INDIGO }}>IQ</Box>
          </Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Heading */}
          <Box mb={4}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#0F172A', letterSpacing: '-0.5px', mb: 0.75 }}>
              Welcome back
            </Typography>
            <Typography sx={{ fontSize: '0.88rem', color: '#64748B' }}>
              Sign in to your HireIQ workspace
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5, fontSize: '0.84rem' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth label="Work email" name="email" type="email"
              value={formData.email} onChange={handleChange}
              error={!!validationErrors.email} helperText={validationErrors.email}
              placeholder="you@company.com"
              disabled={loading} autoComplete="email"
              InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: '1rem', color: '#94A3B8' }} /></InputAdornment> }}
              sx={inputSx}
            />

            <TextField
              fullWidth label="Password" name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password} onChange={handleChange}
              error={!!validationErrors.password} helperText={validationErrors.password}
              placeholder="••••••••"
              disabled={loading} autoComplete="current-password"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: '1rem', color: '#94A3B8' }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(v => !v)} edge="end" sx={{ color: '#94A3B8', '&:hover': { color: INDIGO } }}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={inputSx}
            />

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={-0.5}>
              <FormControlLabel
                control={<Checkbox name="rememberMe" checked={formData.rememberMe} onChange={handleChange} disabled={loading} size="small"
                  sx={{ color: '#CBD5E1', '&.Mui-checked': { color: INDIGO }, p: 0.5 }} />}
                label={<Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>Remember me</Typography>}
              />
              <Typography component="span" sx={{ fontSize: '0.8rem', color: INDIGO, fontWeight: 600, cursor: 'pointer', '&:hover': { color: INDIGO_D } }}>
                Forgot password?
              </Typography>
            </Box>

            <Button
              fullWidth variant="contained" size="large" type="submit" disabled={loading}
              sx={{
                mt: 0.5,
                py: 1.5,
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_D} 100%)`,
                boxShadow: `0 4px 16px rgba(99,102,241,0.35)`,
                textTransform: 'none',
                letterSpacing: '0.01em',
                '&:hover': {
                  background: `linear-gradient(135deg, #818CF8 0%, ${INDIGO} 100%)`,
                  boxShadow: `0 6px 22px rgba(99,102,241,0.45)`,
                },
                '&:disabled': { opacity: 0.65 }
              }}
            >
              {loading
                ? <><CircularProgress size={17} sx={{ mr: 1, color: '#fff' }} /> Signing in...</>
                : 'Sign In'}
            </Button>
          </Box>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 3 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#F1F5F9' }} />
            <Typography sx={{ fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 500 }}>OR</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#F1F5F9' }} />
          </Box>

          <Button
            component={Link} to="/register" fullWidth variant="outlined" size="large" disabled={loading}
            sx={{
              py: 1.4, fontWeight: 600, borderRadius: 1.5, textTransform: 'none',
              borderColor: '#E2E8F0', color: '#475569', fontSize: '0.88rem',
              '&:hover': { borderColor: INDIGO, color: INDIGO, bgcolor: 'rgba(99,102,241,0.04)' }
            }}
          >
            Create an account
          </Button>

          {/* Demo credentials hint */}
          <Box sx={{ mt: 4, p: 2, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
              Demo credentials
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#475569', fontFamily: 'monospace' }}>
              admin@hireiq.ai / Admin123!
            </Typography>
          </Box>

          <Typography sx={{ textAlign: 'center', mt: 4, fontSize: '0.72rem', color: '#CBD5E1' }}>
            © 2026 HireIQ — Powered by Bourntec Solutions
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default LoginPage
