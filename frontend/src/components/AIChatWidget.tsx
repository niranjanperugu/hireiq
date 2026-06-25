import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box, Fab, Drawer, Typography, IconButton, TextField,
  Avatar, Chip, CircularProgress, Tooltip, Divider, Paper,
} from '@mui/material'
import {
  AutoAwesome, Close, Send, ContentCopy, Delete,
  SmartToy, Person, ExpandMore, FiberManualRecord,
} from '@mui/icons-material'
import ReactMarkdown from 'react-markdown'
import { useAppSelector } from '@hooks/redux'
import { sendChatMessage, ChatMessage } from '@services/chatApi'

const INDIGO  = '#6366F1'
const SURFACE = '#F8FAFC'
const BORDER  = '#E2E8F0'
const TEXT1   = '#1E293B'
const TEXT2   = '#64748B'

const SUGGESTED = [
  'Who are the top candidates by ATS score?',
  'How many candidates applied this week?',
  'Show candidates with React skills',
  'Which jobs have the most applicants?',
  'List candidates with score above 80',
  'Summarize the hiring pipeline',
]

interface Msg extends ChatMessage {
  id: string
  ts: Date
  pending?: boolean
  error?: boolean
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'} placement="top">
      <IconButton size="small" onClick={copy} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
        <ContentCopy sx={{ fontSize: 13 }} />
      </IconButton>
    </Tooltip>
  )
}

// Markdown renderer using MUI Typography
function MdText({ content }: { content: string }) {
  return (
    <Box sx={{
      fontSize: '0.82rem', lineHeight: 1.65, color: TEXT1,
      '& p': { m: 0, mb: 0.75 },
      '& ul, & ol': { pl: 2.5, my: 0.5 },
      '& li': { mb: 0.25 },
      '& strong': { fontWeight: 700 },
      '& code': { fontFamily: 'monospace', bgcolor: '#F1F5F9', px: 0.5, borderRadius: 0.5, fontSize: '0.75rem' },
      '& pre': { bgcolor: '#F1F5F9', p: 1, borderRadius: 1, overflow: 'auto', my: 0.5 },
      '& h1, & h2, & h3': { fontWeight: 700, mt: 1, mb: 0.5 },
      '& hr': { borderColor: BORDER, my: 1 },
    }}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </Box>
  )
}

export default function AIChatWidget() {
  const { organizationId } = useAppSelector(s => s.auth)
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: uid(), role: 'assistant', ts: new Date(),
        content: "Hi! I'm **HireIQ AI**, your recruitment assistant. I have access to your live candidate database and job listings.\n\nAsk me anything about candidates, their scores, skills, or your hiring pipeline.",
      }])
    }
  }, [open])

  const historyForApi = useCallback((): ChatMessage[] =>
    messages
      .filter(m => !m.pending && !m.error)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content })),
  [messages])

  const send = useCallback(async (question: string) => {
    if (!question.trim() || loading) return
    setInput('')
    const userMsg: Msg = { id: uid(), role: 'user', content: question, ts: new Date() }
    const pendingMsg: Msg = { id: uid(), role: 'assistant', content: '', ts: new Date(), pending: true }
    setMessages(prev => [...prev, userMsg, pendingMsg])
    setLoading(true)
    try {
      const res = await sendChatMessage(question, organizationId ?? '', historyForApi())
      setMessages(prev => prev.map(m =>
        m.id === pendingMsg.id
          ? { ...m, content: res.answer, pending: false }
          : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === pendingMsg.id
          ? { ...m, content: 'Sorry, something went wrong. Please try again.', pending: false, error: true }
          : m
      ))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading, organizationId, historyForApi])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const clearChat = () => setMessages([])

  const hasMsgs = messages.length > 0

  return (
    <>
      {/* ── Floating button ── */}
      <Box sx={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1300 }}>
        <Tooltip title={open ? '' : 'Ask HireIQ AI'} placement="left">
          <Fab
            onClick={() => setOpen(v => !v)}
            sx={{
              width: 56, height: 56,
              background: `linear-gradient(135deg, ${INDIGO} 0%, #4338CA 100%)`,
              boxShadow: `0 8px 32px ${INDIGO}55`,
              '&:hover': { transform: 'scale(1.07)' },
              transition: 'transform 0.15s',
            }}
          >
            {open
              ? <ExpandMore sx={{ color: '#fff', fontSize: 26 }} />
              : <AutoAwesome sx={{ color: '#fff', fontSize: 22 }} />
            }
          </Fab>
        </Tooltip>
      </Box>

      {/* ── Chat panel ── */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        variant="persistent"
        sx={{
          zIndex: 1200,
          '& .MuiDrawer-paper': {
            width: { xs: '100vw', sm: 420 },
            height: '100vh',
            top: 0,
            border: 'none',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#FFFFFF',
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          background: `linear-gradient(135deg, #1E293B 0%, #0F172A 100%)`,
          px: 2.5, py: 2,
          display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
        }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 2,
            background: `linear-gradient(135deg, ${INDIGO} 0%, #4338CA 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AutoAwesome sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box flex={1}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#F1F5F9', lineHeight: 1.2 }}>
              HireIQ AI
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <FiberManualRecord sx={{ fontSize: 8, color: '#22C55E' }} />
              <Typography sx={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                Live database access
              </Typography>
            </Box>
          </Box>
          {hasMsgs && (
            <Tooltip title="Clear chat">
              <IconButton size="small" onClick={clearChat} sx={{ color: '#64748B', '&:hover': { color: '#EF4444' } }}>
                <Delete sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#64748B', '&:hover': { color: '#F1F5F9' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.map(msg => (
            <Box key={msg.id} display="flex" gap={1} alignItems="flex-start"
              sx={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>

              {/* Avatar */}
              <Avatar sx={{
                width: 28, height: 28, flexShrink: 0, mt: 0.25,
                bgcolor: msg.role === 'user' ? INDIGO : '#0F172A',
                fontSize: '0.7rem',
              }}>
                {msg.role === 'user'
                  ? <Person sx={{ fontSize: 16 }} />
                  : <SmartToy sx={{ fontSize: 15 }} />
                }
              </Avatar>

              {/* Bubble */}
              <Box sx={{
                maxWidth: '82%',
                bgcolor:   msg.role === 'user' ? INDIGO : SURFACE,
                border:    msg.role === 'user' ? 'none' : `1px solid ${BORDER}`,
                borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                px: 1.75, py: 1.25,
                boxShadow: msg.role === 'user' ? `0 2px 12px ${INDIGO}33` : '0 1px 4px rgba(0,0,0,0.06)',
                position: 'relative',
              }}>
                {msg.pending ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={12} sx={{ color: INDIGO }} />
                    <Typography sx={{ fontSize: '0.78rem', color: TEXT2 }}>Thinking…</Typography>
                  </Box>
                ) : msg.role === 'user' ? (
                  <Typography sx={{ fontSize: '0.82rem', color: '#FFFFFF', lineHeight: 1.55 }}>
                    {msg.content}
                  </Typography>
                ) : (
                  <Box>
                    <MdText content={msg.content} />
                    <Box display="flex" justifyContent="flex-end" mt={0.25}>
                      <CopyBtn text={msg.content} />
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          ))}

          {/* Suggested questions (only when only welcome msg) */}
          {messages.length === 1 && (
            <Box mt={0.5}>
              <Typography sx={{ fontSize: '0.65rem', color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1, pl: 0.5 }}>
                Suggested questions
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.75}>
                {SUGGESTED.map(s => (
                  <Chip key={s} label={s} size="small" clickable onClick={() => send(s)}
                    sx={{
                      fontSize: '0.72rem', height: 26, cursor: 'pointer',
                      bgcolor: SURFACE, border: `1px solid ${BORDER}`,
                      color: TEXT1, fontWeight: 500,
                      '&:hover': { bgcolor: `${INDIGO}10`, borderColor: `${INDIGO}60`, color: INDIGO },
                    }} />
                ))}
              </Box>
            </Box>
          )}

          <div ref={bottomRef} />
        </Box>

        <Divider sx={{ borderColor: BORDER }} />

        {/* Input */}
        <Box sx={{ p: 1.75, bgcolor: '#FAFAFA', flexShrink: 0 }}>
          <Box display="flex" gap={1} alignItems="flex-end">
            <TextField
              inputRef={inputRef}
              multiline maxRows={4}
              placeholder="Ask about candidates, jobs, pipeline…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.82rem', borderRadius: 2.5, bgcolor: '#FFFFFF',
                  '& fieldset': { borderColor: BORDER },
                  '&:hover fieldset': { borderColor: `${INDIGO}60` },
                  '&.Mui-focused fieldset': { borderColor: INDIGO, borderWidth: 1.5 },
                },
              }}
            />
            <IconButton
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              sx={{
                width: 40, height: 40, flexShrink: 0,
                background: !input.trim() || loading
                  ? '#E2E8F0'
                  : `linear-gradient(135deg, ${INDIGO} 0%, #4338CA 100%)`,
                borderRadius: 2,
                '&:hover': { transform: 'scale(1.05)' },
                transition: 'all 0.15s',
              }}
            >
              {loading
                ? <CircularProgress size={16} sx={{ color: '#94A3B8' }} />
                : <Send sx={{ fontSize: 17, color: !input.trim() ? '#94A3B8' : '#FFFFFF', transform: 'rotate(-35deg)' }} />
              }
            </IconButton>
          </Box>
          <Typography sx={{ fontSize: '0.6rem', color: '#94A3B8', mt: 0.75, textAlign: 'center' }}>
            Powered by Claude AI · Live data from your ATS database
          </Typography>
        </Box>
      </Drawer>
    </>
  )
}
