import apiClient from './apiClient'

export const sendShortlistEmail = (email: string, name: string, jobTitle: string) =>
  apiClient.post('/notifications/shortlist', { email, name, jobTitle })

export const sendRejectionEmail = (email: string, name: string, jobTitle: string) =>
  apiClient.post('/notifications/reject', { email, name, jobTitle })

export const sendInterviewEmail = (
  email: string, name: string, jobTitle: string,
  dateTime: string, mode: string, meetingLink: string
) => apiClient.post('/notifications/interview', { email, name, jobTitle, dateTime, mode, meetingLink })

export const sendOfferEmail = (email: string, name: string, jobTitle: string) =>
  apiClient.post('/notifications/offer', { email, name, jobTitle })
