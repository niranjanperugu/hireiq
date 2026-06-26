import axios from 'axios'
import apiClient from './apiClient'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

// No-auth client for public interview endpoints
const publicClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Public endpoints (candidate-facing) ────────────────────────────────────

export const getInterviewSession = (token: string) =>
  publicClient.get(`/public/interview/${token}`)

export const startInterview = (
  token: string,
  candidate: { firstName: string; lastName: string; email: string; phone: string }
) => publicClient.post(`/public/interview/${token}/start`, candidate)

export const submitAnswer = (
  token: string,
  answer: string,
  inputMethod: 'text' | 'voice'
) => publicClient.post(`/public/interview/${token}/answer`, { answer, inputMethod })

export const sendTimeout = (token: string) =>
  publicClient.post(`/public/interview/${token}/timeout`)

export const getPublicResults = (token: string) =>
  publicClient.get(`/public/interview/${token}/results`)

// ── Authenticated HR endpoints ──────────────────────────────────────────────

export const createInterviewLink = (data: {
  jobId: string
  jobTitle: string
  jobDescription: string
  skills: string[]
}) => apiClient.post('/interview-links', data)

export const getInterviewLinks = (jobId: string) =>
  apiClient.get(`/interview-links?jobId=${encodeURIComponent(jobId)}`)

export const getInterviewResults = (token: string) =>
  apiClient.get(`/interview-links/${token}/results`)
