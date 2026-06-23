import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  MenuItem,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { Job } from '@store/jobsSlice'

interface JobFormProps {
  job?: Job
  onSubmit: (data: any) => Promise<void>
  loading?: boolean
  error?: string | null
}

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']
const WORK_MODES = ['REMOTE', 'HYBRID', 'ON_SITE']

const JobForm: React.FC<JobFormProps> = ({
  job,
  onSubmit,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    employmentType: job?.employmentType || 'FULL_TIME',
    workMode: job?.workMode || 'HYBRID',
    location: job?.location || '',
    departmentId: '',
    minExperienceYears: job?.minExperienceYears || '',
    maxExperienceYears: job?.maxExperienceYears || '',
    salaryMin: job?.salaryMin || '',
    salaryMax: job?.salaryMax || ''
  })

  const [requirements, setRequirements] = useState<any[]>([])
  const [newRequirement, setNewRequirement] = useState({ type: 'SKILL', value: '' })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.title.trim()) {
      errors.title = 'Title is required'
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    } else if (formData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters'
    }

    if (!formData.location.trim()) {
      errors.location = 'Location is required'
    }

    if (formData.minExperienceYears && isNaN(Number(formData.minExperienceYears))) {
      errors.minExperienceYears = 'Must be a number'
    }

    if (formData.maxExperienceYears && isNaN(Number(formData.maxExperienceYears))) {
      errors.maxExperienceYears = 'Must be a number'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as any
    setFormData({ ...formData, [name]: value })
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' })
    }
  }

  const handleAddRequirement = () => {
    if (newRequirement.value.trim()) {
      setRequirements([...requirements, newRequirement])
      setNewRequirement({ type: 'SKILL', value: '' })
    }
  }

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      await onSubmit({ ...formData, requirements })
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {/* Basic Info */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Job Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={!!validationErrors.title}
            helperText={validationErrors.title}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            error={!!validationErrors.description}
            helperText={validationErrors.description}
            disabled={loading}
            multiline
            rows={4}
            size="small"
          />
        </Grid>

        {/* Employment Details */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label="Employment Type"
            name="employmentType"
            value={formData.employmentType}
            onChange={handleChange}
            disabled={loading}
            size="small"
          >
            {EMPLOYMENT_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {type.replace('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label="Work Mode"
            name="workMode"
            value={formData.workMode}
            onChange={handleChange}
            disabled={loading}
            size="small"
          >
            {WORK_MODES.map(mode => (
              <MenuItem key={mode} value={mode}>
                {mode.replace('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Location & Experience */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            error={!!validationErrors.location}
            helperText={validationErrors.location}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Min Experience (years)"
            name="minExperienceYears"
            type="number"
            value={formData.minExperienceYears}
            onChange={handleChange}
            error={!!validationErrors.minExperienceYears}
            helperText={validationErrors.minExperienceYears}
            disabled={loading}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Max Experience (years)"
            name="maxExperienceYears"
            type="number"
            value={formData.maxExperienceYears}
            onChange={handleChange}
            error={!!validationErrors.maxExperienceYears}
            helperText={validationErrors.maxExperienceYears}
            disabled={loading}
            size="small"
          />
        </Grid>

        {/* Salary */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Salary Min"
            name="salaryMin"
            type="number"
            value={formData.salaryMin}
            onChange={handleChange}
            disabled={loading}
            size="small"
            InputProps={{ startAdornment: '$' }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Salary Max"
            name="salaryMax"
            type="number"
            value={formData.salaryMax}
            onChange={handleChange}
            disabled={loading}
            size="small"
            InputProps={{ startAdornment: '$' }}
          />
        </Grid>

        {/* Requirements */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardHeader
              title="Requirements"
              subheader="Add skills, certifications, or education requirements"
              avatar={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    select
                    size="small"
                    value={newRequirement.type}
                    onChange={(e) => setNewRequirement({ ...newRequirement, type: e.target.value })}
                    sx={{ width: 120 }}
                  >
                    <MenuItem value="SKILL">Skill</MenuItem>
                    <MenuItem value="CERTIFICATION">Certification</MenuItem>
                    <MenuItem value="EDUCATION">Education</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    placeholder="Requirement"
                    value={newRequirement.value}
                    onChange={(e) => setNewRequirement({ ...newRequirement, value: e.target.value })}
                    sx={{ width: 150 }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleAddRequirement}
                    disabled={!newRequirement.value.trim()}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            />
            {requirements.length > 0 && (
              <CardContent>
                <List dense>
                  {requirements.map((req, index) => (
                    <ListItem
                      key={index}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveRequirement(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={req.value}
                        secondary={req.type}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            )}
          </Card>
        </Grid>

        {/* Submit */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Save Job'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default JobForm
