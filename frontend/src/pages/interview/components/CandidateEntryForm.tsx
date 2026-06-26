import React, { useState } from 'react'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Grid, CircularProgress, Divider, Chip
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import QuizIcon from '@mui/icons-material/Quiz'
import SmartToyIcon from '@mui/icons-material/SmartToy'

interface Props {
  jobTitle: string
  totalQuestions: number
  timeLimitMinutes: number
  onSubmit: (info: { firstName: string; lastName: string; email: string; phone: string }) => Promise<void>
}

const CandidateEntryForm: React.FC<Props> = ({ jobTitle, totalQuestions, timeLimitMinutes, onSubmit }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim())  e.lastName  = 'Last name is required'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Valid email is required'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10)
      e.phone = 'Valid phone number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(e2 => { const n = { ...e2 }; delete n[field]; return n })
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setApiError('')
    try {
      await onSubmit(form)
    } catch (err: any) {
      setApiError(err?.response?.data?.error || 'Failed to start interview. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F1F5F9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <SmartToyIcon sx={{ color: '#6366F1', fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B' }}>
            HireIQ AI Interview
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Powered by Artificial Intelligence
        </Typography>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 520, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Job Info */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#EEF2FF', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Position
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', mt: 0.5 }}>
              {jobTitle || 'Interview'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Chip
                icon={<QuizIcon sx={{ fontSize: 14 }} />}
                label={`${totalQuestions} questions`}
                size="small"
                sx={{ bgcolor: '#C7D2FE', color: '#3730A3', fontWeight: 600 }}
              />
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                label={`${timeLimitMinutes} minutes`}
                size="small"
                sx={{ bgcolor: '#C7D2FE', color: '#3730A3', fontWeight: 600 }}
              />
            </Box>
          </Box>

          <Typography variant="body2" sx={{ color: '#64748B', mb: 3, lineHeight: 1.7 }}>
            Please fill in your details to begin. The AI will ask you questions tailored to this role.
            You can type your answers or use the microphone. Once started, the timer cannot be paused.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* Form */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="First Name"
                value={form.firstName}
                onChange={handleChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
                fullWidth
                size="small"
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last Name"
                value={form.lastName}
                onChange={handleChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
                fullWidth
                size="small"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email Address"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
                size="small"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Mobile Number"
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                fullWidth
                size="small"
                required
              />
            </Grid>
          </Grid>

          {apiError && (
            <Typography variant="body2" sx={{ color: '#EF4444', mt: 2, textAlign: 'center' }}>
              {apiError}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              mt: 3,
              py: 1.5,
              bgcolor: '#6366F1',
              borderRadius: 2,
              fontWeight: 700,
              fontSize: '1rem',
              textTransform: 'none',
              '&:hover': { bgcolor: '#4F46E5' },
            }}
          >
            {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Start Interview →'}
          </Button>

          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: '#94A3B8' }}>
            By starting, you agree that your answers will be analysed by AI.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default CandidateEntryForm
