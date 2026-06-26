import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, CircularProgress, Typography, Card, CardContent,
  Chip, Button, Divider
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import WorkIcon from '@mui/icons-material/Work'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import InterviewRoom from '@pages/interview/components/InterviewRoom'
import {
  getAssessmentSession, startAssessment,
  submitAssessmentAnswer, sendAssessmentTimeout, getPublicAssessmentResults,
} from '@services/assessmentApi'

type Phase = 'loading' | 'submitted' | 'confirm' | 'assessment' | 'complete'

const AssessmentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()

  const [phase, setPhase]             = useState<Phase>('loading')
  const [sessionData, setSession]     = useState<any>({})
  const [question, setQuestion]       = useState('')
  const [qIndex, setQIndex]           = useState(0)
  const [remainingSecs, setRemaining] = useState<number | undefined>(undefined)
  const [evaluation, setEval]         = useState<any>({})
  const [starting, setStarting]       = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    if (!token) { setPhase('submitted'); return }
    getAssessmentSession(token)
      .then(({ data }) => {
        // Completed / expired / submitted
        if (data.expired || data.submitted) { setPhase('submitted'); return }

        setSession(data)

        if (data.status === 'COMPLETED' || data.alreadyCompleted) {
          getPublicAssessmentResults(token)
            .then(r => setEval(r.data.evaluation ?? {})).catch(() => {})
          setPhase('complete')
          return
        }

        // Resume in-progress session — skip confirm screen
        if (data.status === 'IN_PROGRESS' && data.resuming && data.currentQuestion) {
          setQuestion(data.currentQuestion)
          setQIndex(data.questionIndex ?? 0)
          setRemaining(data.remainingSeconds)
          setPhase('assessment')
          return
        }

        setPhase('confirm')
      })
      .catch(() => setPhase('submitted'))
  }, [token])

  const handleStart = async () => {
    setStarting(true)
    try {
      const { data } = await startAssessment(token!)
      if (data.submitted || data.expired) { setPhase('submitted'); return }
      setQuestion(data.question)
      setQIndex(data.questionIndex ?? 0)
      setRemaining(data.remainingSeconds)
      setPhase('assessment')
    } catch {
      setError('Failed to start assessment. Please try again.')
      setStarting(false)
    }
  }

  const handleAnswer = async (answer: string, method: 'text' | 'voice') => {
    const { data } = await submitAssessmentAnswer(token!, answer, method)
    if (data.isComplete || data.submitted || data.expired) {
      setEval(data.evaluation ?? {})
      setPhase('complete')
    } else {
      setQuestion(data.nextQuestion)
      setQIndex(data.questionIndex)
      if (data.remainingSeconds !== undefined) setRemaining(data.remainingSeconds)
    }
  }

  const handleTimeout = async () => {
    try {
      const { data } = await sendAssessmentTimeout(token!)
      setEval(data.evaluation ?? {})
    } catch {}
    setPhase('complete')
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <AssignmentIcon sx={{ fontSize: 48, color: '#6366F1' }} />
      <CircularProgress sx={{ color: '#6366F1' }} />
      <Typography variant="body2" sx={{ color: '#64748B' }}>Loading your assessment…</Typography>
    </Box>
  )

  // ── Submitted / expired ──────────────────────────────────────────────────
  if (phase === 'submitted') return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2.5, p: 3, textAlign: 'center' }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 40, color: '#6366F1' }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B' }}>
        Assessment Response Already Submitted
      </Typography>
      <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 420, lineHeight: 1.7 }}>
        Thank you for completing the assessment. Your responses have been recorded and are being reviewed by our team.
      </Typography>
      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
        You will be contacted with next steps.
      </Typography>
    </Box>
  )

  // ── Confirm screen ───────────────────────────────────────────────────────
  if (phase === 'confirm') return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
          <SmartToyIcon sx={{ color: '#6366F1', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1E293B' }}>HireIQ Skills Assessment</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748B' }}>Powered by Artificial Intelligence</Typography>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 500, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          {/* Job */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#EEF2FF', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Position</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', mt: 0.5 }}>{sessionData.jobTitle}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Chip label="10 questions" size="small" sx={{ bgcolor: '#C7D2FE', color: '#3730A3', fontWeight: 600 }} />
              <Chip label="45 minutes" size="small" sx={{ bgcolor: '#C7D2FE', color: '#3730A3', fontWeight: 600 }} />
            </Box>
          </Box>

          {/* Candidate info — read-only */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B', mb: 1.5 }}>
            Your Profile <Chip label="Read-only" size="small" sx={{ ml: 1, fontSize: '0.6rem', bgcolor: '#F1F5F9', color: '#64748B' }} />
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            {[
              { icon: <PersonIcon sx={{ fontSize: 16 }} />, label: sessionData.candidateName },
              { icon: <EmailIcon  sx={{ fontSize: 16 }} />, label: sessionData.candidateEmail },
              { icon: <PhoneIcon  sx={{ fontSize: 16 }} />, label: sessionData.candidatePhone },
              { icon: <WorkIcon   sx={{ fontSize: 16 }} />, label: sessionData.candidateRole },
            ].filter(r => r.label).map((r, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                <Box sx={{ color: '#94A3B8' }}>{r.icon}</Box>
                <Typography variant="body2" sx={{ color: '#374151' }}>{r.label}</Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 2.5 }} />
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5, lineHeight: 1.7 }}>
            You will answer <strong>10 questions</strong> tailored to this role. You have <strong>45 minutes</strong>.
            Answer by typing or using the microphone. <strong>The timer starts immediately and cannot be paused.</strong>
          </Typography>

          {error && <Typography variant="body2" sx={{ color: '#EF4444', mb: 2, textAlign: 'center' }}>{error}</Typography>}

          <Button variant="contained" fullWidth size="large" onClick={handleStart} disabled={starting}
            sx={{ py: 1.5, bgcolor: '#6366F1', borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '1rem', '&:hover': { bgcolor: '#4F46E5' } }}>
            {starting
              ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                  <span>Generating questions…</span>
                </Box>
              : 'Start Assessment →'}
          </Button>
          {starting && (
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', textAlign: 'center', mt: 1 }}>
              AI is personalizing your 10 questions — this takes ~5 seconds
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )

  // ── Active assessment ────────────────────────────────────────────────────
  if (phase === 'assessment') return (
    <InterviewRoom
      question={question}
      questionIndex={qIndex}
      totalQuestions={sessionData.totalQuestions ?? 10}
      timeLimitMinutes={sessionData.timeLimitMinutes ?? 45}
      remainingSeconds={remainingSecs}
      jobTitle={sessionData.jobTitle ?? ''}
      onSubmitAnswer={handleAnswer}
      onTimeout={handleTimeout}
    />
  )

  // ── Complete ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
      <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, boxShadow: '0 0 0 12px #DCFCE740' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 52, color: '#16A34A' }} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mb: 1.5 }}>
        Thank You, {sessionData.candidateName?.split(' ')[0] || 'Candidate'}!
      </Typography>
      <Typography variant="body1" sx={{ color: '#475569', maxWidth: 460, lineHeight: 1.8, mb: 3 }}>
        Thank you <strong>{sessionData.candidateName}</strong> for completing the assessment.
        Your responses have been recorded and are being reviewed by our team.
      </Typography>
      <Box sx={{ p: 2, bgcolor: '#F0FDF4', borderRadius: 2, border: '1px solid #BBF7D0', maxWidth: 400 }}>
        <Typography variant="body2" sx={{ color: '#166534', lineHeight: 1.7 }}>
          We will be in touch with the next steps shortly. You may now close this window.
        </Typography>
      </Box>
    </Box>
  )
}

export default AssessmentPage
