import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient } from '@services/apiClient'

export interface Candidate {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  location?: string
  currentCompany?: string
  totalExperienceYears?: number
  summary?: string
  createdAt?: string
  updatedAt?: string
}

export interface CandidatesState {
  candidates: Candidate[]
  selectedCandidate: Candidate | null
  pagination: {
    page: number
    size: number
    totalElements: number
    totalPages: number
  }
  loading: boolean
  error: string | null
}

const initialState: CandidatesState = {
  candidates: [],
  selectedCandidate: null,
  pagination: {
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0
  },
  loading: false,
  error: null
}

export const fetchCandidates = createAsyncThunk(
  'candidates/fetchCandidates',
  async ({ organizationId, page = 0, size = 20 }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/organizations/${organizationId}/candidates?page=${page}&size=${size}`
      )
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch candidates')
    }
  }
)

export const searchCandidates = createAsyncThunk(
  'candidates/searchCandidates',
  async ({ organizationId, query, page = 0 }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/organizations/${organizationId}/candidates/search?query=${query}&page=${page}`
      )
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Search failed')
    }
  }
)

export const getCandidateById = createAsyncThunk(
  'candidates/getCandidateById',
  async ({ organizationId, candidateId }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/organizations/${organizationId}/candidates/${candidateId}`
      )
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch candidate')
    }
  }
)

export const createCandidate = createAsyncThunk(
  'candidates/createCandidate',
  async ({ organizationId, candidateData }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/organizations/${organizationId}/candidates`,
        candidateData
      )
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create candidate')
    }
  }
)

export const updateCandidate = createAsyncThunk(
  'candidates/updateCandidate',
  async ({ organizationId, candidateId, candidateData }: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(
        `/organizations/${organizationId}/candidates/${candidateId}`,
        candidateData
      )
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update candidate')
    }
  }
)

const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    clearSelectedCandidate: (state) => {
      state.selectedCandidate = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidates.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.loading = false
        state.candidates = action.payload.content
        state.pagination = {
          page: action.payload.pageNumber,
          size: action.payload.pageSize,
          totalElements: action.payload.totalElements,
          totalPages: action.payload.totalPages
        }
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(getCandidateById.fulfilled, (state, action) => {
        state.selectedCandidate = action.payload
      })
      .addCase(createCandidate.fulfilled, (state, action) => {
        state.candidates.push(action.payload)
      })
      .addCase(updateCandidate.fulfilled, (state, action) => {
        const index = state.candidates.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.candidates[index] = action.payload
        }
        if (state.selectedCandidate?.id === action.payload.id) {
          state.selectedCandidate = action.payload
        }
      })
  }
})

export const { clearSelectedCandidate } = candidatesSlice.actions
export default candidatesSlice.reducer
