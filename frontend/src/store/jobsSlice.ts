import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient } from '@services/apiClient'

export interface Job {
  id: string
  jobCode?: string
  title: string
  description: string
  departmentId?: string
  departmentName?: string
  employmentType: string
  workMode: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  location: string
  status: string
  featured?: boolean
  published?: boolean
  deadline?: string
  applicationCount?: number
  postedDate?: string
  closedDate?: string
  createdAt?: string
  updatedAt?: string
  minExperienceYears?: number
  maxExperienceYears?: number
}

export interface JobsState {
  jobs: Job[]
  selectedJob: Job | null
  pagination: any
  loading: boolean
  error: string | null
}

const initialState: JobsState = {
  jobs: [],
  selectedJob: null,
  pagination: { page: 0, size: 10, totalElements: 0, totalPages: 0 },
  loading: false,
  error: null
}

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async ({ organizationId, page = 0, size = 10, search = '' }: any, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page: String(page), size: String(size) })
      if (search) params.set('search', search)
      const response = await apiClient.get(`/organizations/${organizationId}/jobs?${params}`)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs')
    }
  }
)

export const getJobById = createAsyncThunk(
  'jobs/getJobById',
  async ({ organizationId, jobId }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/organizations/${organizationId}/jobs/${jobId}`)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job')
    }
  }
)

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async ({ organizationId, jobData }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/organizations/${organizationId}/jobs`, jobData)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create job')
    }
  }
)

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ organizationId, jobId, jobData }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/organizations/${organizationId}/jobs/${jobId}`, jobData)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update job')
    }
  }
)

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async ({ organizationId, jobId }: any, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/organizations/${organizationId}/jobs/${jobId}`)
      return jobId
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete job')
    }
  }
)

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearSelectedJob: (state) => { state.selectedJob = null }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false
        state.jobs = action.payload.content
        state.pagination = action.payload
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(getJobById.fulfilled, (state, action) => { state.selectedJob = action.payload })
      .addCase(createJob.fulfilled, (state, action) => {
        state.jobs.unshift(action.payload)
        state.pagination.totalElements = (state.pagination.totalElements || 0) + 1
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        const idx = state.jobs.findIndex(j => j.id === action.payload.id)
        if (idx !== -1) state.jobs[idx] = action.payload
        if (state.selectedJob?.id === action.payload.id) state.selectedJob = action.payload
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.jobs = state.jobs.filter(j => j.id !== action.payload)
        state.pagination.totalElements = Math.max(0, (state.pagination.totalElements || 1) - 1)
      })
  }
})

export const { clearSelectedJob } = jobsSlice.actions
export default jobsSlice.reducer
