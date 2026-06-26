import axios from 'axios'
import apiClient from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

const publicClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── HR authenticated ────────────────────────────────────────────────────────

export const createAssessment = (data: {
  jobId: string; jobTitle: string; jobDescription: string; skills: string[]
  candidateId: string; candidateName: string; candidateEmail: string
  candidatePhone: string; candidateRole: string
}) => apiClient.post('/assessments', data)

export const getAssessments = (jobId: string, candidateId?: string) =>
  apiClient.get(`/assessments?jobId=${encodeURIComponent(jobId)}${candidateId ? `&candidateId=${encodeURIComponent(candidateId)}` : ''}`)

export const getAssessmentResults = (token: string) =>
  apiClient.get(`/assessments/${token}/results`)

// ── Public (candidate-facing) ───────────────────────────────────────────────

export const getAssessmentSession = (token: string) =>
  publicClient.get(`/public/assessment/${token}`)

export const startAssessment = (token: string) =>
  publicClient.post(`/public/assessment/${token}/start`)

export const submitAssessmentAnswer = (token: string, answer: string, inputMethod: 'text' | 'voice') =>
  publicClient.post(`/public/assessment/${token}/answer`, { answer, inputMethod })

export const sendAssessmentTimeout = (token: string) =>
  publicClient.post(`/public/assessment/${token}/timeout`)

export const getPublicAssessmentResults = (token: string) =>
  publicClient.get(`/public/assessment/${token}/results`)
