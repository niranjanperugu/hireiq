import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material'
import { Candidate } from '@store/candidatesSlice'

interface CandidateFormProps {
  candidate?: Candidate
  onSubmit: (data: any) => Promise<void>
  loading?: boolean
  error?: string | null
}

const CandidateForm: React.FC<CandidateFormProps> = ({
  candidate,
  onSubmit,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState({
    firstName: candidate?.firstName || '',
    lastName: candidate?.lastName || '',
    email: candidate?.email || '',
    phone: candidate?.phone || '',
    location: candidate?.location || '',
    currentCompany: candidate?.currentCompany || '',
    currentDesignation: candidate?.currentDesignation || '',
    totalExperienceYears: candidate?.totalExperienceYears || '',
    summary: candidate?.summary || ''
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
      errors.email = 'Invalid email format'
    }

    if (formData.totalExperienceYears && isNaN(Number(formData.totalExperienceYears))) {
      errors.totalExperienceYears = 'Must be a number'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      await onSubmit(formData)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            error={!!validationErrors.firstName}
            helperText={validationErrors.firstName}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            error={!!validationErrors.lastName}
            helperText={validationErrors.lastName}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Current Company"
            name="currentCompany"
            value={formData.currentCompany}
            onChange={handleChange}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Current Designation"
            name="currentDesignation"
            value={formData.currentDesignation}
            onChange={handleChange}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Years of Experience"
            name="totalExperienceYears"
            type="number"
            value={formData.totalExperienceYears}
            onChange={handleChange}
            error={!!validationErrors.totalExperienceYears}
            helperText={validationErrors.totalExperienceYears}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Summary"
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            disabled={loading}
            multiline
            rows={4}
            size="small"
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default CandidateForm
