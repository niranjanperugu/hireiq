import { apiClient } from './apiClient'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  answer: string
  enabled: boolean
}

export async function sendChatMessage(
  question: string,
  organizationId: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const res = await apiClient.post('/ai/chat', { question, organizationId, history })
  return res.data.data as ChatResponse
}

export async function getAiStatus(): Promise<boolean> {
  try {
    const res = await apiClient.get('/ai/status')
    return res.data.data?.enabled ?? false
  } catch {
    return false
  }
}
