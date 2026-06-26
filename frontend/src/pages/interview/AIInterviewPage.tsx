import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, CircularProgress, Typography, Button } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SmartToyIcon from '@mui/icons-material/SmartToy'

import CandidateEntryForm from './components/CandidateEntryForm'
import InterviewRoom from './components/InterviewRoom'
import InterviewCompletePage from './InterviewCompletePage'
import {
  getInterviewSession, startInterview, submitAnswer,
  sendTimeout, getPublicResults,
} from '@services/interviewApi'

type Phase = 'loading' | 'expired' | 'entry' | 'interview' | 'complete'

interface SessionMeta {
  jobTitle: string
  totalQuestions: number
  timeLimitMinutes: number
}

interface InterviewState {
  question: string
  questionIndex: number
}

const AIInterviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()

  const [phase, setPhase]           = useState<Phase>('loading')
  const [meta, setMeta]             = useState<SessionMeta>({ jobTitle: '', totalQuestions: 10, timeLimitMinutes: 30 })
  const [interview, setInterview]   = useState<InterviewState>({ question: '', questionIndex: 0 })
  const [candidateName, setCandidateName] = useState('')
  const [evaluation, setEvaluation] = useState<Record<string, any>>({})
  const [loadError, setLoadError]   = useState('')

  // On mount: check if link is valid
  useEffect(() => {
    if (!token) { setPhase('expired'); return }
    getInterviewSession(token)
      .then(({ data }) => {
        if (data.expired) { setPhase('expired'); return }
        setMeta({
          jobTitle:        data.jobTitle ?? '',
          totalQuestions:  data.totalQuestions ?? 10,
          timeLimitMinutes: data.timeLimitMinutes ?? 30,
        })
        if (data.alreadyCompleted) {
          // Fetch results for display
          getPublicResults(token)
            .then(r => setEvaluation(r.data.evaluation ?? {}))
            .catch(() => {})
          setPhase('complete')
        } else {
          setPhase('entry')
        }
      })
      .catch(() => { setPhase('expired'); setLoadError('Could not load interview session.') })
  }, [token])

  // Candidate submits entry form → start interview
  const handleStart = async (info: { firstName: string; lastName: string; email: string; phone: string }) => {
    const { data } = await startInterview(token!, info)
    setCandidateName(info.firstName)
    setInterview({ question: data.question, questionIndex: 0 })
    setMeta(m => ({ ...m, totalQuestions: data.totalQuestions, timeLimitMinutes: data.timeLimitMinutes }))
    setPhase('interview')
  }

  // Candidate submits an answer
  const handleAnswer = async (answer: string, method: 'text' | 'voice') => {
    const { data } = await submitAnswer(token!, answer, method)
    if (data.isComplete) {
      setEvaluation(data.evaluation ?? {})
      setPhase('complete')
    } else {
      setInterview({ question: data.nextQuestion, questionIndex: data.questionIndex })
    }
  }

  // 30-min timer expired in browser
  const handleTimeout = async () => {
    try {
      const { data } = await sendTimeout(token!)
      setEvaluation(data.evaluation ?? {})
    } catch { /* continue to complete page even if API fails */ }
    setPhase('complete')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <SmartToyIcon sx={{ fontSize: 48, color: '#6366F1' }} />
        <CircularProgress sx={{ color: '#6366F1' }} />
        <Typography variant="body2" sx={{ color: '#64748B' }}>Loading your interview…</Typography>
      </Box>
    )
  }

  if (phase === 'expired') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, textAlign: 'center' }}>
        <SmartToyIcon sx={{ fontSize: 48, color: '#6366F1' }} />
        <ErrorOutlineIcon sx={{ fontSize: 56, color: '#EF4444' }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
          Interview Link Expired
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 400 }}>
          {loadError || 'This interview link has expired, already been used, or does not exist. Please contact the hiring team for a new link.'}
        </Typography>
      </Box>
    )
  }

  if (phase === 'entry') {
    return (
      <CandidateEntryForm
        jobTitle={meta.jobTitle}
        totalQuestions={meta.totalQuestions}
        timeLimitMinutes={meta.timeLimitMinutes}
        onSubmit={handleStart}
      />
    )
  }

  if (phase === 'interview') {
    return (
      <InterviewRoom
        question={interview.question}
        questionIndex={interview.questionIndex}
        totalQuestions={meta.totalQuestions}
        timeLimitMinutes={meta.timeLimitMinutes}
        jobTitle={meta.jobTitle}
        onSubmitAnswer={handleAnswer}
        onTimeout={handleTimeout}
      />
    )
  }

  // complete
  return (
    <InterviewCompletePage
      jobTitle={meta.jobTitle}
      candidateName={candidateName}
      evaluation={evaluation}
    />
  )
}

export default AIInterviewPage
