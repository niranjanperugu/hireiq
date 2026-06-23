import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box, Typography, Button, Chip, Avatar, Divider,
  Select, MenuItem, FormControl, InputLabel, TextField,
  Collapse, IconButton, ToggleButtonGroup, ToggleButton,
  Table, TableBody, TableCell, TableRow, Tooltip, Alert,
} from '@mui/material'
import {
  ExpandMore, ExpandLess, Edit, CheckCircle, Cancel,
  PauseCircle, ArrowForward, NoteAlt, Send,
  Add, HowToReg, AutoAwesome, Delete, Groups,
  RadioButtonUnchecked, AssignmentTurnedIn, FlagOutlined,
} from '@mui/icons-material'
import {
  loadEvaluations, saveEvaluation, loadPanelMembers,
  DEFAULT_STAGES, uid, Evaluation, EvalType, RoundType, RoundStatus,
  InterviewRound, loadInterviewRounds, saveInterviewRound, deleteInterviewRound,
  PipelineCandidate, loadPipeline, savePipeline, loadSettings,
  ShortlistRecord, saveShortlistRecord, getShortlistRecord,
  CandidateNote, loadCandidateNotes, saveCandidateNote,
} from '@utils/pipelineStorage'
import { useAppSelector } from '@hooks/redux'
import apiClient from '@services/apiClient'

// ── Tokens ────────────────────────────────────────────────────────────────────
const ORANGE = '#6366F1'
const BG     = '#EEF0FF'
const CARD   = '#FFFFFF'
const BORDER = '#E2E8F0'
const TEXT1  = '#1E293B'
const TEXT2  = '#64748B'
const TEXT3  = '#94A3B8'
const GREEN  = '#16A34A'
const PURPLE = '#7C3AED'

// ── Round type config ─────────────────────────────────────────────────────────
const ROUND_TYPES: { value: RoundType; label: string; color: string; evalDefault: EvalType }[] = [
  { value:'TECHNICAL',  label:'Technical',        color:'#2563EB', evalDefault:'TECHNICAL'     },
  { value:'BEHAVIORAL', label:'Behavioral',        color:'#7C3AED', evalDefault:'BEHAVIORAL'    },
  { value:'HR',         label:'HR Round',          color:'#DB2777', evalDefault:'COMMUNICATION' },
  { value:'LEADERSHIP', label:'Leadership',         color:'#D97706', evalDefault:'BEHAVIORAL'    },
  { value:'DESIGN',     label:'Design Review',      color:'#0891B2', evalDefault:'TECHNICAL'     },
  { value:'FINAL',      label:'Final Interview',    color:'#16A34A', evalDefault:'COMMUNICATION' },
]
const roundTypeCfg = (t: RoundType) => ROUND_TYPES.find(r=>r.value===t) ?? ROUND_TYPES[0]

const STATUS_CFG: Record<RoundStatus,{label:string;color:string;bg:string}> = {
  PENDING:     {label:'Pending',     color:'#D97706', bg:'#FEF9C3'},
  IN_PROGRESS: {label:'In Progress', color:'#2563EB', bg:'#DBEAFE'},
  COMPLETED:   {label:'Completed',   color:'#16A34A', bg:'#DCFCE7'},
}

// ── Eval type config ──────────────────────────────────────────────────────────
const SKILL_SETS: Record<EvalType, string[]> = {
  TECHNICAL:     ['Problem Solving','Code Quality','System Design','Architecture Knowledge','Tech Communication'],
  BEHAVIORAL:    ['Leadership','Teamwork','Adaptability','Initiative','Conflict Resolution'],
  COMMUNICATION: ['Clarity','Active Listening','Articulation','Confidence','Presentation Skills'],
}
const EVAL_LABELS: Record<EvalType,string> = {
  TECHNICAL:'Technical', BEHAVIORAL:'Behavioral', COMMUNICATION:'Communication',
}
const EVAL_COLORS: Record<EvalType,string> = {
  TECHNICAL:'#2563EB', BEHAVIORAL:'#7C3AED', COMMUNICATION:'#059669',
}
const RATING_LABELS: Record<number,string> = {
  1:'Poor',2:'Fair',3:'Average',4:'Good',5:'Excellent',
}
const REC_OPTIONS = [
  {value:'ADVANCE',label:'Proceed to Next Round'},
  {value:'HIRE',   label:'Strong Hire'},
  {value:'HOLD',   label:'Hold – Review Later'},
  {value:'REJECT', label:'Do Not Proceed'},
]
const REC_COLORS: Record<string,string> = {
  ADVANCE:'#2563EB',HIRE:'#16A34A',HOLD:'#D97706',REJECT:'#DC2626',
}
const ROLE_DISPLAY: Record<string,string> = {
  HR_ADMINISTRATOR:'HR Administrator',HIRING_MANAGER:'Hiring Manager',
  RECRUITER:'Recruiter',INTERVIEW_PANEL_MEMBER:'Panel Member',
}

// ── Star components ───────────────────────────────────────────────────────────
const STAR_CLIP = 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
function StarRow({value,max=5}:{value:number;max?:number}) {
  return (
    <Box sx={{display:'flex',gap:0.3}}>
      {Array.from({length:max}).map((_,i)=>(
        <Box key={i} component="span" sx={{
          display:'inline-block',width:13,height:13,flexShrink:0,
          clipPath:STAR_CLIP, bgcolor:i<value?'#F59E0B':'#CBD5E1',
        }}/>
      ))}
    </Box>
  )
}
function StarPicker({value,onChange}:{value:number;onChange:(v:number)=>void}) {
  const [hover,setHover] = useState(0)
  return (
    <Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
      {[1,2,3,4,5].map(i=>(
        <Box key={i} component="span"
          onClick={()=>onChange(i)} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(0)}
          sx={{ display:'inline-block',width:22,height:22,cursor:'pointer',flexShrink:0,
            clipPath:STAR_CLIP, bgcolor:i<=(hover||value)?'#F59E0B':'#CBD5E1',
            transition:'transform 0.1s', transform:i===(hover||value)?'scale(1.2)':'scale(1)' }}/>
      ))}
      {value>0 && <Typography sx={{fontSize:12,color:TEXT2,fontWeight:600,ml:0.5}}>
        {value} – {RATING_LABELS[value]}
      </Typography>}
    </Box>
  )
}
function RecBadge({rec}:{rec:string}) {
  const label = REC_OPTIONS.find(r=>r.value===rec)?.label ?? rec
  const color = REC_COLORS[rec] ?? TEXT2
  return <Chip label={label} size="small" sx={{height:22,fontSize:11,fontWeight:700,borderRadius:1,
    bgcolor:color+'18',color,border:`1px solid ${color}35`}}/>
}

// ── Feedback form (used inside each round card) ───────────────────────────────
interface FeedbackFormProps {
  round: InterviewRound
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  authName: string
  authEmail: string
  authRole: string
  authRoleLabel: string
  submitterOptions: {id:string;name:string;position:string;email:string;color:string}[]
  editEval?: Evaluation
  onSaved: () => void
  onCancel: () => void
}

function FeedbackForm({round,jobId,jobTitle,candidateId,candidateName,
  authName,authEmail,authRole,authRoleLabel,submitterOptions,editEval,onSaved,onCancel}: FeedbackFormProps) {
  const defaultType = roundTypeCfg(round.type).evalDefault
  const [submitterId, setSubmitterId] = useState(()=>{
    if (editEval) return submitterOptions.find(s=>s.email===editEval.submitterEmail)?.id ?? '__hr__'
    return '__hr__'
  })
  const [evalType,    setEvalType]    = useState<EvalType>(editEval?.evaluationType ?? defaultType)
  const [skills,      setSkills]      = useState(()=>
    editEval?.skillRatings?.length ? editEval.skillRatings : SKILL_SETS[editEval?.evaluationType??defaultType].map(s=>({skill:s,rating:0}))
  )
  const [techComment, setTechComment] = useState(editEval?.technicalComments ?? '')
  const [behaComment, setBehaComment] = useState(editEval?.behavioralComments ?? '')
  const [commComment, setCommComment] = useState(editEval?.communicationComments ?? '')
  const [overallRating, setOverall]   = useState(editEval?.overallRating ?? 0)
  const [recommendation,setRec]       = useState<'ADVANCE'|'HIRE'|'REJECT'|'HOLD'>(editEval?.recommendation ?? 'ADVANCE')

  const switchType = (type: EvalType) => {
    setEvalType(type)
    if (!editEval) setSkills(SKILL_SETS[type].map(s=>({skill:s,rating:0})))
  }
  const setSkillRating = (skill:string,rating:number) =>
    setSkills(prev=>prev.map(s=>s.skill===skill?{...s,rating}:s))

  const active = submitterOptions.find(s=>s.id===submitterId) ?? submitterOptions[0]
  const typeColor = EVAL_COLORS[evalType]

  const save = (isDraft: boolean) => {
    const ev: Evaluation = {
      id: editEval?.id ?? uid(),
      jobId, jobTitle, candidateId, candidateName,
      stageId: round.id, stageName: round.title,
      interviewRoundId: round.id,
      panelMember: active.name, submitterEmail: active.email,
      evaluationType: evalType,
      skillRatings: skills.filter(s=>s.rating>0),
      technicalComments:     evalType==='TECHNICAL'     ? techComment : '',
      behavioralComments:    evalType==='BEHAVIORAL'    ? behaComment : '',
      communicationComments: evalType==='COMMUNICATION' ? commComment : '',
      overallRating: overallRating||3,
      comments: [techComment,behaComment,commComment].filter(Boolean).join('\n\n'),
      recommendation, submittedAt: new Date().toISOString(), isDraft,
    }
    saveEvaluation(ev)
    onSaved()
  }

  return (
    <Box sx={{borderTop:`1px solid ${BORDER}`,pt:2,mt:1}}>
      <Typography sx={{fontSize:11,fontWeight:700,color:TEXT2,mb:1.5,
        textTransform:'uppercase',letterSpacing:'0.08em'}}>
        {editEval ? 'Edit Feedback' : 'Add Feedback'}
      </Typography>

      {/* Submitting As + Eval Type */}
      <Box sx={{display:'grid',gridTemplateColumns:'1fr auto',gap:1.5,mb:2}}>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:12}}>Submitting As</InputLabel>
          <Select value={submitterId} label="Submitting As"
            onChange={e=>setSubmitterId(e.target.value)}
            renderValue={v=>{
              const s=submitterOptions.find(o=>o.id===v)
              return <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                <Avatar sx={{width:18,height:18,fontSize:8,fontWeight:700,bgcolor:s?.color+'30',color:s?.color}}>
                  {s?.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </Avatar>
                <Typography sx={{fontSize:12}}>{s?.name}</Typography>
              </Box>
            }}
            sx={{fontSize:12}}>
            {submitterOptions.map(s=>(
              <MenuItem key={s.id} value={s.id} sx={{gap:1,py:0.75}}>
                <Avatar sx={{width:24,height:24,fontSize:9,fontWeight:700,bgcolor:s.color+'25',color:s.color}}>
                  {s.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </Avatar>
                <Box>
                  <Typography sx={{fontSize:12,fontWeight:600,lineHeight:1.2}}>{s.name}</Typography>
                  <Typography sx={{fontSize:10,color:TEXT3}}>{s.position}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup value={evalType} exclusive size="small"
          onChange={(_,v)=>v&&switchType(v as EvalType)}
          sx={{ height:40,
            '& .MuiToggleButton-root':{fontSize:11,fontWeight:600,px:1.25,textTransform:'none',borderColor:BORDER,color:TEXT2},
            '& .Mui-selected':{bgcolor:`${typeColor}18 !important`,color:`${typeColor} !important`,borderColor:`${typeColor}50 !important`},
          }}>
          {(Object.keys(SKILL_SETS) as EvalType[]).map(t=>(
            <ToggleButton key={t} value={t} sx={{whiteSpace:'nowrap'}}>{EVAL_LABELS[t]}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Skill ratings */}
      <Box sx={{mb:2,bgcolor:BG,borderRadius:1.5,p:1.75,border:`1px solid ${BORDER}`}}>
        <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
          letterSpacing:'0.08em',mb:1.25,color:typeColor}}>
          {EVAL_LABELS[evalType]} Skill Ratings
        </Typography>
        {skills.map(sr=>(
          <Box key={sr.skill} sx={{display:'flex',alignItems:'center',mb:1.25,'&:last-child':{mb:0}}}>
            <Typography sx={{width:170,fontSize:12,color:TEXT2,fontWeight:500,flexShrink:0}}>{sr.skill}</Typography>
            <StarPicker value={sr.rating} onChange={v=>setSkillRating(sr.skill,v)}/>
          </Box>
        ))}
      </Box>

      {/* Comment */}
      <TextField fullWidth multiline rows={2} size="small"
        label={`${EVAL_LABELS[evalType]} Comments`}
        placeholder="Observations, strengths, concerns…"
        value={evalType==='TECHNICAL' ? techComment : evalType==='BEHAVIORAL' ? behaComment : commComment}
        onChange={e=>{
          if(evalType==='TECHNICAL')     setTechComment(e.target.value)
          if(evalType==='BEHAVIORAL')    setBehaComment(e.target.value)
          if(evalType==='COMMUNICATION') setCommComment(e.target.value)
        }}
        sx={{mb:2,'& .MuiOutlinedInput-root':{fontSize:13,bgcolor:BG}}}/>

      {/* Rating + Recommend */}
      <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1.5,mb:2}}>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:12}}>Overall Rating</InputLabel>
          <Select value={overallRating} label="Overall Rating"
            onChange={e=>setOverall(Number(e.target.value))} displayEmpty
            renderValue={v=>v===0
              ? <Typography sx={{color:TEXT3,fontSize:12}}>Select…</Typography>
              : <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                  <StarRow value={v as number}/>
                  <Typography sx={{fontSize:11,color:TEXT2,fontWeight:600}}>
                    {v} – {RATING_LABELS[v as number]}
                  </Typography>
                </Box>}
            sx={{fontSize:12}}>
            {[1,2,3,4,5].map(n=>(
              <MenuItem key={n} value={n} sx={{gap:1,py:0.75}}>
                <StarRow value={n}/>
                <Typography sx={{fontSize:12,fontWeight:600}}>{n} – {RATING_LABELS[n]}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:12}}>Recommend</InputLabel>
          <Select value={recommendation} label="Recommend"
            onChange={e=>setRec(e.target.value as any)} sx={{fontSize:12}}>
            {REC_OPTIONS.map(o=>(
              <MenuItem key={o.value} value={o.value}>
                <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                  {o.value==='ADVANCE'?<ArrowForward sx={{fontSize:13,color:'#2563EB'}}/>
                  :o.value==='HIRE'   ?<CheckCircle  sx={{fontSize:13,color:'#16A34A'}}/>
                  :o.value==='HOLD'   ?<PauseCircle  sx={{fontSize:13,color:'#D97706'}}/>
                  :<Cancel sx={{fontSize:13,color:'#DC2626'}}/>}
                  <Typography sx={{fontSize:12}}>{o.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{display:'flex',justifyContent:'flex-end',gap:1}}>
        <Button size="small" onClick={onCancel}
          sx={{fontSize:12,textTransform:'none',color:TEXT2,borderColor:BORDER,border:'1px solid',
            '&:hover':{bgcolor:BG}}}>Cancel</Button>
        <Button size="small" onClick={()=>save(true)}
          sx={{fontSize:12,textTransform:'none',color:TEXT2,borderColor:BORDER,border:'1px solid',
            '&:hover':{bgcolor:BG}}}>Save Draft</Button>
        <Button variant="contained" color="primary" size="small"
          disabled={overallRating===0}
          startIcon={<Send sx={{fontSize:13}}/>}
          onClick={()=>save(false)}
          sx={{fontSize:12,textTransform:'none',fontWeight:700}}>
          Submit
        </Button>
      </Box>
    </Box>
  )
}

// ── Feedback mini-card inside round ──────────────────────────────────────────
function FeedbackMini({ev,canEdit,onEdit,onDelete}:
  {ev:Evaluation;canEdit:boolean;onEdit:()=>void;onDelete:()=>void}) {
  const [expanded,setExpanded]=useState(false)
  const typeColor = ev.evaluationType ? EVAL_COLORS[ev.evaluationType] : TEXT2
  return (
    <Box sx={{border:`1px solid ${BORDER}`,borderRadius:1.5,overflow:'hidden',mb:1}}>
      <Box sx={{display:'flex',alignItems:'center',gap:1,px:1.5,py:1,
        bgcolor:ev.isDraft?'#FFFBEB':CARD,
        borderBottom:expanded?`1px solid ${BORDER}`:'none'}}>
        <Avatar sx={{width:26,height:26,fontSize:10,fontWeight:700,flexShrink:0,
          bgcolor:typeColor+'25',color:typeColor}}>
          {ev.panelMember.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}
        </Avatar>
        <Box sx={{flex:1,minWidth:0}}>
          <Box sx={{display:'flex',alignItems:'center',gap:0.75,flexWrap:'wrap'}}>
            <Typography sx={{fontSize:12,fontWeight:700,color:TEXT1}}>{ev.panelMember}</Typography>
            {ev.evaluationType && <Chip label={EVAL_LABELS[ev.evaluationType]} size="small"
              sx={{height:17,fontSize:9,fontWeight:700,borderRadius:1,
                bgcolor:typeColor+'15',color:typeColor,border:`1px solid ${typeColor}30`}}/>}
            {ev.isDraft && <Chip label="Draft" size="small"
              sx={{height:17,fontSize:9,bgcolor:'#FEF9C3',color:'#92400E',borderRadius:1}}/>}
            <RecBadge rec={ev.recommendation}/>
          </Box>
        </Box>
        <StarRow value={ev.overallRating}/>
        {canEdit && <>
          <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}
            sx={{color:ORANGE,p:0.25,'&:hover':{bgcolor:ORANGE+'12'}}}>
            <Edit sx={{fontSize:13}}/>
          </IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" onClick={onDelete}
            sx={{color:'#DC2626',p:0.25,'&:hover':{bgcolor:'#FEF2F2'}}}>
            <Delete sx={{fontSize:13}}/>
          </IconButton></Tooltip>
        </>}
        <IconButton size="small" onClick={()=>setExpanded(e=>!e)} sx={{color:TEXT3,p:0.25}}>
          {expanded?<ExpandLess sx={{fontSize:15}}/>:<ExpandMore sx={{fontSize:15}}/>}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{px:2,py:1.5,bgcolor:BG}}>
          {ev.skillRatings?.length>0 && (
            <Table size="small" sx={{'& td':{border:'none',py:0.4,px:0}}}>
              <TableBody>
                {ev.skillRatings.map((sr:any)=>(
                  <TableRow key={sr.skill}>
                    <TableCell sx={{width:160}}><Typography sx={{fontSize:11,color:TEXT2}}>{sr.skill}</Typography></TableCell>
                    <TableCell><StarRow value={sr.rating}/></TableCell>
                    <TableCell><Typography sx={{fontSize:10,color:TEXT3}}>{RATING_LABELS[sr.rating]}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {[
            {label:'Technical',    text:ev.technicalComments,    color:EVAL_COLORS.TECHNICAL},
            {label:'Behavioral',   text:ev.behavioralComments,   color:EVAL_COLORS.BEHAVIORAL},
            {label:'Communication',text:ev.communicationComments,color:EVAL_COLORS.COMMUNICATION},
          ].filter(c=>c.text).map(c=>(
            <Box key={c.label} sx={{mt:1}}>
              <Typography sx={{fontSize:9,color:c.color,fontWeight:700,mb:0.25}}>{c.label}</Typography>
              <Typography sx={{fontSize:12,color:TEXT2,lineHeight:1.6,
                bgcolor:CARD,p:1,borderRadius:1,borderLeft:`2px solid ${c.color}`}}>
                {c.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Round card ─────────────────────────────────────────────────────────────────
interface RoundCardProps {
  round: InterviewRound
  allEvals: Evaluation[]
  authName: string
  authEmail: string
  authRole: string
  authRoleLabel: string
  submitterOptions: {id:string;name:string;position:string;email:string;color:string}[]
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  onRoundChange: () => void
}

function RoundCard({round,allEvals,authName,authEmail,authRole,authRoleLabel,
  submitterOptions,jobId,jobTitle,candidateId,candidateName,onRoundChange}: RoundCardProps) {
  const cfg = roundTypeCfg(round.type)
  const evals = allEvals.filter(e=>e.interviewRoundId===round.id)
  const [showForm, setShowForm]     = useState(false)
  const [editEval, setEditEval]     = useState<Evaluation|undefined>()
  const [collapsed, setCollapsed]   = useState(false)

  // Auto-derive status
  const autoStatus: RoundStatus = evals.filter(e=>!e.isDraft).length === 0 ? 'PENDING'
    : evals.filter(e=>!e.isDraft).length >= round.assignedPanelMemberIds.length
      ? 'COMPLETED' : 'IN_PROGRESS'
  const stCfg = STATUS_CFG[round.status || autoStatus]

  const canEditEval = (ev: Evaluation) =>
    ev.submitterEmail===authEmail || authRole==='HR_ADMINISTRATOR'

  const deleteEval = (id: string) => {
    // Remove from storage
    const all = JSON.parse(localStorage.getItem('hs_evaluations')?? '[]')
    localStorage.setItem('hs_evaluations', JSON.stringify(all.filter((e:any)=>e.id!==id)))
    onRoundChange()
  }

  const markComplete = () => {
    saveInterviewRound({...round, status:'COMPLETED'})
    onRoundChange()
  }

  const handleDelete = () => {
    deleteInterviewRound(round.id)
    // Remove all evals for this round too
    const all = JSON.parse(localStorage.getItem('hs_evaluations')?? '[]')
    localStorage.setItem('hs_evaluations',
      JSON.stringify(all.filter((e:any)=>e.interviewRoundId!==round.id)))
    onRoundChange()
  }

  // Which panel members haven't submitted yet
  const submittedEmails = evals.filter(e=>!e.isDraft).map(e=>e.submitterEmail)
  const pendingMembers  = submitterOptions.filter(s=>
    round.assignedPanelMemberIds.includes(s.id) && !submittedEmails.includes(s.email)
  )

  return (
    <Box sx={{ border:`1.5px solid ${BORDER}`, borderRadius:2.5, overflow:'hidden', mb:2.5,
      boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>

      {/* Round header */}
      <Box sx={{ px:2.5, py:1.75, bgcolor:CARD, borderBottom:`1px solid ${BORDER}`,
        display:'flex', alignItems:'center', gap:1.5 }}>
        <Box sx={{ width:4, height:36, borderRadius:99, bgcolor:cfg.color, flexShrink:0 }}/>
        <Box sx={{ flex:1, minWidth:0 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
            <Typography sx={{ fontSize:14, fontWeight:800, color:TEXT1 }}>{round.title}</Typography>
            <Chip label={cfg.label} size="small"
              sx={{ height:20, fontSize:10, fontWeight:700, borderRadius:1,
                bgcolor:cfg.color+'15', color:cfg.color, border:`1px solid ${cfg.color}30` }}/>
            <Chip label={stCfg.label} size="small"
              sx={{ height:20, fontSize:10, fontWeight:700, borderRadius:1,
                bgcolor:stCfg.bg, color:stCfg.color }}/>
          </Box>
          <Typography sx={{ fontSize:11, color:TEXT3 }}>
            Created by {round.createdBy} · {new Date(round.createdAt).toLocaleDateString('en-US',
              {month:'short',day:'numeric',year:'numeric'})}
          </Typography>
        </Box>
        <Box sx={{ display:'flex', gap:0.5, flexShrink:0 }}>
          {round.status!=='COMPLETED' && (
            <Tooltip title="Mark as Completed">
              <IconButton size="small" onClick={markComplete}
                sx={{ color:GREEN, '&:hover':{ bgcolor:GREEN+'12' } }}>
                <AssignmentTurnedIn sx={{fontSize:17}}/>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete round">
            <IconButton size="small" onClick={handleDelete}
              sx={{ color:TEXT3, '&:hover':{ color:'#DC2626', bgcolor:'#FEF2F2' } }}>
              <Delete sx={{fontSize:16}}/>
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={()=>setCollapsed(c=>!c)} sx={{color:TEXT3}}>
            {collapsed ? <ExpandMore sx={{fontSize:18}}/> : <ExpandLess sx={{fontSize:18}}/>}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!collapsed}>
        <Box sx={{ px:2.5, py:2, bgcolor:BG }}>
          {/* Panel members */}
          {round.assignedPanelMemberIds.length>0 && (
            <Box sx={{ mb:2 }}>
              <Typography sx={{ fontSize:10, fontWeight:700, color:TEXT3,
                textTransform:'uppercase', letterSpacing:'0.08em', mb:1 }}>
                Panel Members ({round.assignedPanelMemberIds.length})
              </Typography>
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.75 }}>
                {round.assignedPanelMemberNames.map((name, i) => {
                  const hasSubmitted = submittedEmails.includes(
                    submitterOptions.find(s=>s.id===round.assignedPanelMemberIds[i])?.email
                  )
                  return (
                    <Box key={i} sx={{ display:'flex', alignItems:'center', gap:0.75,
                      px:1, py:0.4, borderRadius:1.5, bgcolor:CARD, border:`1px solid ${BORDER}` }}>
                      <Avatar sx={{ width:20, height:20, fontSize:9, fontWeight:700,
                        bgcolor: hasSubmitted ? GREEN+'25' : BORDER,
                        color:   hasSubmitted ? GREEN : TEXT3 }}>
                        {name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                      </Avatar>
                      <Typography sx={{ fontSize:12, color:TEXT1, fontWeight:500 }}>{name}</Typography>
                      {hasSubmitted
                        ? <CheckCircle sx={{fontSize:13,color:GREEN}}/>
                        : <RadioButtonUnchecked sx={{fontSize:13,color:TEXT3}}/>}
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )}

          {/* Submitted feedback */}
          {evals.length > 0 && (
            <Box sx={{ mb:2 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                <Typography sx={{ fontSize:10, fontWeight:700, color:TEXT3,
                  textTransform:'uppercase', letterSpacing:'0.08em', flex:1 }}>
                  Feedback ({evals.length})
                </Typography>
                {pendingMembers.length > 0 && (
                  <Typography sx={{ fontSize:10, color:'#D97706' }}>
                    {pendingMembers.length} pending
                  </Typography>
                )}
              </Box>
              {evals.map(ev=>(
                <FeedbackMini key={ev.id} ev={ev}
                  canEdit={canEditEval(ev)}
                  onEdit={()=>{ setEditEval(ev); setShowForm(true) }}
                  onDelete={()=>deleteEval(ev.id)}
                />
              ))}
            </Box>
          )}

          {/* Pending notice */}
          {evals.length===0 && round.assignedPanelMemberIds.length>0 && (
            <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2,
              p:1.25, bgcolor:CARD, borderRadius:1.5, border:`1px dashed ${BORDER}` }}>
              <FlagOutlined sx={{fontSize:16,color:TEXT3}}/>
              <Typography sx={{ fontSize:12, color:TEXT2 }}>
                Awaiting feedback from {round.assignedPanelMemberNames.join(', ')}
              </Typography>
            </Box>
          )}

          {/* Add Feedback button + inline form */}
          {!showForm ? (
            <Button size="small" variant="outlined"
              startIcon={<Add sx={{fontSize:14}}/>}
              onClick={()=>{ setEditEval(undefined); setShowForm(true) }}
              sx={{ fontSize:12, textTransform:'none', fontWeight:600,
                borderColor:ORANGE, color:ORANGE,
                '&:hover':{ bgcolor:ORANGE+'08', borderColor:ORANGE } }}>
              Add Feedback
            </Button>
          ) : (
            <FeedbackForm
              round={round} jobId={jobId} jobTitle={jobTitle}
              candidateId={candidateId} candidateName={candidateName}
              authName={authName} authEmail={authEmail}
              authRole={authRole} authRoleLabel={authRoleLabel}
              submitterOptions={submitterOptions}
              editEval={editEval}
              onSaved={()=>{ setShowForm(false); setEditEval(undefined); onRoundChange() }}
              onCancel={()=>{ setShowForm(false); setEditEval(undefined) }}
            />
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  jobId: string
  jobTitle: string
  candidateId: string
  candidateName: string
  candidateEmail?: string
  candidateRole?: string
  atsScore?: number
  stages?: {id:string;label:string;type?:string}[]
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InterviewRoundsTab({
  jobId,jobTitle,candidateId,candidateName,candidateEmail,candidateRole,atsScore,
}: Props) {
  const auth         = useAppSelector(s=>s.auth)
  const panelMembers = loadPanelMembers()
  const settings     = loadSettings()

  const authName      = `${auth.user?.firstName??''} ${auth.user?.lastName??''}`.trim()||'HR Admin'
  const authEmail     = auth.user?.email ?? ''
  const authRole      = (auth.user?.role as string) ?? 'HR_ADMINISTRATOR'
  const authRoleLabel = ROLE_DISPLAY[authRole] ?? authRole

  const submitterOptions = [
    {id:'__hr__',name:authName,position:authRoleLabel,email:authEmail,color:ORANGE},
    ...panelMembers.map(m=>({id:m.id,name:m.name,position:m.position,email:m.email,color:m.avatarColor})),
  ]

  // ── Panels ────────────────────────────────────────────────────────────────
  const [showShortlistForm, setShowShortlistForm] = useState(false)
  const [showAddRound,      setShowAddRound]      = useState(false)
  const [showNoteForm,      setShowNoteForm]      = useState(false)

  // ── Shortlist ─────────────────────────────────────────────────────────────
  const isAI = (atsScore??0) >= settings.atsThreshold
  const [shortlistRecord, setShortlistRecord] = useState<ShortlistRecord|null>(null)
  const [shortlistNote,   setShortlistNote]   = useState('')
  const [shortlisting,    setShortlisting]    = useState(false)

  useEffect(()=>{
    setShortlistRecord(getShortlistRecord(candidateId, jobId))
  },[candidateId,jobId])

  // ── Rounds ────────────────────────────────────────────────────────────────
  const [roundsVer, setRoundsVer] = useState(0)
  const rounds = useMemo(()=>loadInterviewRounds(candidateId, jobId),[candidateId,jobId,roundsVer])

  const [allEvals, setAllEvals] = useState<Evaluation[]>([])
  useEffect(()=>{
    setAllEvals(loadEvaluations().filter(e=>e.candidateId===candidateId&&e.jobId===jobId))
  },[candidateId,jobId,roundsVer])

  const refreshRounds = useCallback(()=>setRoundsVer(v=>v+1),[])

  // ── Add Round form ────────────────────────────────────────────────────────
  const [newRoundTitle,    setNewRoundTitle]   = useState('')
  const [newRoundType,     setNewRoundType]    = useState<RoundType>('TECHNICAL')
  const [selectedMemberIds,setSelectedMembers] = useState<string[]>([])

  const openAddRound = () => {
    const n = rounds.length + 1
    const cfg = roundTypeCfg('TECHNICAL')
    setNewRoundTitle(`Round ${n} – ${cfg.label}`)
    setNewRoundType('TECHNICAL')
    setSelectedMembers([])
    setShowAddRound(true)
  }

  const handleRoundTypeChange = (type: RoundType) => {
    setNewRoundType(type)
    const n = rounds.length + 1
    setNewRoundTitle(`Round ${n} – ${roundTypeCfg(type).label}`)
  }

  const createRound = () => {
    if (!newRoundTitle.trim()) return
    const names = selectedMemberIds.map(id=>
      panelMembers.find(m=>m.id===id)?.name ?? id
    )
    const round: InterviewRound = {
      id: uid(), candidateId, jobId,
      roundNumber: rounds.length + 1,
      title: newRoundTitle.trim(),
      type: newRoundType,
      assignedPanelMemberIds: selectedMemberIds,
      assignedPanelMemberNames: names,
      createdBy: authName, createdByEmail: authEmail,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    }
    saveInterviewRound(round)
    setShowAddRound(false)
    refreshRounds()
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState('')
  const [noteVer,  setNoteVer]  = useState(0)
  const notes = useMemo(()=>loadCandidateNotes(candidateId, jobId),[candidateId,jobId,noteVer])

  // ── Shortlist action ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<{msg:string;err?:boolean}|null>(null)
  const showToast = (msg:string,err=false)=>{ setToast({msg,err}); setTimeout(()=>setToast(null),3000) }

  const confirmShortlist = async () => {
    setShortlisting(true)
    try {
      const method:'MANUAL'|'AI' = isAI ? 'AI' : 'MANUAL'
      const record: ShortlistRecord = {
        id:uid(), candidateId, jobId, candidateName, candidateEmail,
        shortlistedBy:authName, shortlistedByRole:authRole, shortlistedByEmail:authEmail,
        method, atsScore, notes:shortlistNote||undefined,
        shortlistedAt:new Date().toISOString(),
      }
      const pl = loadPipeline(jobId)
      const allStages = pl.stages.length ? pl.stages : DEFAULT_STAGES
      const slStage = allStages.find((s:any)=>s.type==='shortlist')
      if (slStage) {
        if (!pl.candidates.find(c=>c.id===candidateId))
          pl.candidates.push({id:candidateId,name:candidateName,
            role:candidateRole??'',email:candidateEmail??'',
            atsScore:atsScore??0,experience:0,matchedSkills:[]} as PipelineCandidate)
        pl.stageMap[candidateId] = slStage.id
        savePipeline(jobId, pl)
      }
      saveShortlistRecord(record)
      setShortlistRecord(record)
      try {
        const aid = candidateId.startsWith('applied_') ? candidateId.replace('applied_','') : candidateId
        await apiClient.post('/shortlist',{resumeAnalysisId:aid,jobId,
          organizationId:auth.user?.organizationId,candidateName,candidateEmail,
          shortlistedBy:authName,method,atsScore,notes:shortlistNote||null})
      } catch {}
      setShowShortlistForm(false); setShortlistNote('')
      showToast(`${candidateName} shortlisted successfully`)
    } finally { setShortlisting(false) }
  }

  const addNote = () => {
    if (!noteText.trim()) return
    saveCandidateNote({id:uid(),candidateId,jobId,text:noteText.trim(),
      addedBy:authName,addedByRole:authRoleLabel,addedAt:new Date().toISOString()})
    setNoteText(''); setNoteVer(v=>v+1); showToast('Note added')
  }

  const isShortlisted = !!shortlistRecord

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {toast && <Alert severity={toast.err?'error':'success'} onClose={()=>setToast(null)}
        sx={{mb:2,borderRadius:2,fontSize:12}}>{toast.msg}</Alert>}

      {/* ── THREE BUTTONS ─────────────────────────────────────────────────── */}
      <Box sx={{display:'flex',gap:1.5,mb:3,flexWrap:'wrap'}}>
        {/* Shortlist */}
        <Button variant={isShortlisted?'contained':'outlined'}
          startIcon={<HowToReg sx={{fontSize:15}}/>}
          onClick={()=>!isShortlisted&&setShowShortlistForm(s=>!s)}
          sx={isShortlisted ? {
            fontSize:13,textTransform:'none',fontWeight:700,pointerEvents:'none',
            bgcolor:GREEN,background:`linear-gradient(135deg,#22C55E,${GREEN})`,
            boxShadow:`0 2px 8px ${GREEN}40`,
          } : {
            fontSize:13,textTransform:'none',fontWeight:600,
            borderColor:showShortlistForm?GREEN:BORDER,color:showShortlistForm?GREEN:TEXT1,
            '&:hover':{borderColor:GREEN,color:GREEN,bgcolor:GREEN+'0A'},
          }}>
          {isShortlisted ? '✓ Shortlisted' : showShortlistForm ? 'Cancel' : 'Shortlist Candidate'}
        </Button>

        {/* Add Round — only shown after shortlisted */}
        {isShortlisted && (
          <Button variant="contained" color="primary"
            startIcon={<Add sx={{fontSize:15}}/>}
            onClick={openAddRound}
            sx={{fontSize:13,textTransform:'none',fontWeight:700}}>
            Add Round
          </Button>
        )}

        {/* Notes */}
        <Button variant="outlined"
          startIcon={<NoteAlt sx={{fontSize:15}}/>}
          onClick={()=>setShowNoteForm(s=>!s)}
          sx={{fontSize:13,textTransform:'none',fontWeight:600,
            borderColor:showNoteForm?PURPLE:BORDER,color:showNoteForm?PURPLE:TEXT1,
            '&:hover':{borderColor:PURPLE,color:PURPLE,bgcolor:PURPLE+'08'}}}>
          {showNoteForm?'Hide Notes':'Add Notes'}
          {notes.length>0&&<Chip label={notes.length} size="small"
            sx={{ml:1,height:18,fontSize:10,bgcolor:PURPLE+'18',color:PURPLE}}/>}
        </Button>
      </Box>

      {/* ── SHORTLIST FORM ────────────────────────────────────────────────── */}
      <Collapse in={showShortlistForm&&!isShortlisted}>
        <Box sx={{border:`1.5px solid ${GREEN}45`,borderRadius:2,overflow:'hidden',mb:3}}>
          <Box sx={{px:2.5,py:1.5,bgcolor:'#F0FDF4',borderBottom:`1px solid #BBF7D0`,
            display:'flex',alignItems:'center',gap:1}}>
            <HowToReg sx={{color:GREEN,fontSize:18}}/>
            <Typography sx={{fontSize:13,fontWeight:700,color:'#166534'}}>Shortlist Candidate</Typography>
          </Box>
          <Box sx={{p:2.5,bgcolor:CARD}}>
            <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,mb:2}}>
              <Box sx={{p:1.75,bgcolor:BG,borderRadius:1.5,border:`1px solid ${BORDER}`}}>
                <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
                  letterSpacing:'0.08em',mb:0.75}}>Shortlisted By</Typography>
                <Typography sx={{fontSize:13,fontWeight:700,color:TEXT1}}>{authName}</Typography>
                <Typography sx={{fontSize:11,color:TEXT2}}>{authRoleLabel}</Typography>
              </Box>
              <Box sx={{p:1.75,bgcolor:BG,borderRadius:1.5,border:`1px solid ${BORDER}`}}>
                <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,textTransform:'uppercase',
                  letterSpacing:'0.08em',mb:0.75}}>Method</Typography>
                <Box sx={{display:'flex',alignItems:'center',gap:0.75}}>
                  {isAI?(<>
                    <AutoAwesome sx={{color:ORANGE,fontSize:14}}/>
                    <Typography sx={{fontSize:12,fontWeight:700,color:ORANGE}}>AI-Assisted</Typography>
                    {atsScore!=null&&<Chip label={`ATS ${atsScore}%`} size="small"
                      sx={{height:18,fontSize:10,bgcolor:ORANGE+'15',color:ORANGE,borderRadius:1}}/>}
                  </>):(<>
                    <HowToReg sx={{color:'#2563EB',fontSize:14}}/>
                    <Typography sx={{fontSize:12,fontWeight:700,color:'#2563EB'}}>Manual Review</Typography>
                  </>)}
                </Box>
              </Box>
            </Box>
            <TextField fullWidth size="small" multiline rows={2}
              label="Reason / Notes (optional)" placeholder="Strong match…"
              value={shortlistNote} onChange={e=>setShortlistNote(e.target.value)}
              sx={{mb:2,'& .MuiOutlinedInput-root':{fontSize:13,bgcolor:BG}}}/>
            <Box sx={{display:'flex',gap:1.5,justifyContent:'flex-end'}}>
              <Button size="small" onClick={()=>{setShowShortlistForm(false);setShortlistNote('')}}
                sx={{fontSize:12,color:TEXT2,textTransform:'none'}}>Cancel</Button>
              <Button variant="contained" disabled={shortlisting} onClick={confirmShortlist}
                startIcon={<CheckCircle sx={{fontSize:14}}/>}
                sx={{fontSize:12,textTransform:'none',fontWeight:700,
                  bgcolor:GREEN,background:`linear-gradient(135deg,#22C55E,${GREEN})`}}>
                {shortlisting?'Shortlisting…':'Confirm Shortlist'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Collapse>

      {/* ── SHORTLIST BANNER ──────────────────────────────────────────────── */}
      {isShortlisted&&shortlistRecord&&(
        <Box sx={{p:2,borderRadius:2,bgcolor:'#F0FDF4',border:'1px solid #BBF7D0',
          mb:3,display:'flex',alignItems:'flex-start',gap:1.5}}>
          <CheckCircle sx={{color:GREEN,fontSize:20,mt:0.1,flexShrink:0}}/>
          <Box sx={{flex:1}}>
            <Box sx={{display:'flex',alignItems:'center',gap:1,flexWrap:'wrap',mb:0.4}}>
              <Typography sx={{fontSize:13,fontWeight:700,color:'#166534'}}>
                Shortlisted by {shortlistRecord.shortlistedBy}
              </Typography>
              <Chip label={ROLE_DISPLAY[shortlistRecord.shortlistedByRole]??shortlistRecord.shortlistedByRole}
                size="small" sx={{height:18,fontSize:10,bgcolor:GREEN+'18',color:GREEN,borderRadius:1}}/>
              {shortlistRecord.method==='AI'
                ?<Chip icon={<AutoAwesome sx={{'fontSize':'10px !important',color:ORANGE}}/>}
                    label="AI-Assisted" size="small"
                    sx={{height:18,fontSize:10,bgcolor:ORANGE+'12',color:ORANGE,borderRadius:1}}/>
                :<Chip label="Manual Review" size="small"
                    sx={{height:18,fontSize:10,bgcolor:'#DBEAFE',color:'#2563EB',borderRadius:1}}/>}
              {shortlistRecord.atsScore!=null&&
                <Typography sx={{fontSize:11,color:TEXT2}}>· ATS {shortlistRecord.atsScore}%</Typography>}
            </Box>
            <Typography sx={{fontSize:11,color:TEXT2}}>
              {new Date(shortlistRecord.shortlistedAt).toLocaleDateString('en-US',
                {weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
            </Typography>
            {shortlistRecord.notes&&
              <Typography sx={{fontSize:12,color:'#166534',mt:0.75,fontStyle:'italic'}}>
                "{shortlistRecord.notes}"
              </Typography>}
          </Box>
        </Box>
      )}

      {/* ── ADD ROUND FORM ────────────────────────────────────────────────── */}
      <Collapse in={showAddRound}>
        <Box sx={{border:`1.5px solid ${ORANGE}35`,borderRadius:2.5,overflow:'hidden',mb:3}}>
          <Box sx={{px:2.5,py:1.5,bgcolor:ORANGE+'0A',borderBottom:`1px solid ${ORANGE}25`,
            display:'flex',alignItems:'center',gap:1,justifyContent:'space-between'}}>
            <Box sx={{display:'flex',alignItems:'center',gap:1}}>
              <Groups sx={{color:ORANGE,fontSize:18}}/>
              <Typography sx={{fontSize:13,fontWeight:700,color:TEXT1}}>Create Interview Round</Typography>
            </Box>
            <IconButton size="small" onClick={()=>setShowAddRound(false)} sx={{color:TEXT3}}>
              <Cancel sx={{fontSize:16}}/>
            </IconButton>
          </Box>
          <Box sx={{p:2.5,bgcolor:CARD}}>
            {/* Title + Type */}
            <Box sx={{display:'grid',gridTemplateColumns:'1fr auto',gap:1.5,mb:2.5}}>
              <TextField size="small" label="Round Title" value={newRoundTitle}
                onChange={e=>setNewRoundTitle(e.target.value)}
                sx={{'& .MuiOutlinedInput-root':{fontSize:13}}}/>
              <FormControl size="small" sx={{minWidth:160}}>
                <InputLabel sx={{fontSize:13}}>Round Type</InputLabel>
                <Select value={newRoundType} label="Round Type"
                  onChange={e=>handleRoundTypeChange(e.target.value as RoundType)} sx={{fontSize:13}}>
                  {ROUND_TYPES.map(rt=>(
                    <MenuItem key={rt.value} value={rt.value}>
                      <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                        <Box sx={{width:8,height:8,borderRadius:'50%',bgcolor:rt.color,flexShrink:0}}/>
                        <Typography sx={{fontSize:13}}>{rt.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Assign panel members */}
            <Box sx={{mb:2.5}}>
              <Typography sx={{fontSize:11,fontWeight:700,color:TEXT2,mb:1.25,
                textTransform:'uppercase',letterSpacing:'0.07em'}}>
                Assign Panel Members
              </Typography>
              <Box sx={{display:'flex',flexWrap:'wrap',gap:0.75}}>
                {panelMembers.map(m=>{
                  const sel = selectedMemberIds.includes(m.id)
                  return (
                    <Box key={m.id} onClick={()=>setSelectedMembers(prev=>
                        sel ? prev.filter(id=>id!==m.id) : [...prev,m.id])}
                      sx={{ display:'flex',alignItems:'center',gap:0.75,
                        px:1.25,py:0.6,borderRadius:1.5,cursor:'pointer',transition:'all 0.12s',
                        border:`1.5px solid ${sel?m.avatarColor:BORDER}`,
                        bgcolor:sel?m.avatarColor+'12':BG,
                        '&:hover':{borderColor:m.avatarColor,bgcolor:m.avatarColor+'0F'} }}>
                      {sel && <CheckCircle sx={{fontSize:13,color:m.avatarColor}}/>}
                      <Avatar sx={{width:22,height:22,fontSize:9,fontWeight:700,
                        bgcolor:m.avatarColor+'25',color:m.avatarColor}}>
                        {m.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                      </Avatar>
                      <Box>
                        <Typography sx={{fontSize:12,fontWeight:sel?700:500,
                          color:sel?m.avatarColor:TEXT1,lineHeight:1.2}}>{m.name}</Typography>
                        <Typography sx={{fontSize:9,color:TEXT3}}>{m.department}</Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
              {selectedMemberIds.length>0&&(
                <Typography sx={{fontSize:11,color:TEXT2,mt:1}}>
                  {selectedMemberIds.length} panel member{selectedMemberIds.length>1?'s':''} selected
                </Typography>
              )}
            </Box>

            <Box sx={{display:'flex',gap:1.5,justifyContent:'flex-end'}}>
              <Button size="small" onClick={()=>setShowAddRound(false)}
                sx={{fontSize:12,color:TEXT2,textTransform:'none'}}>Cancel</Button>
              <Button variant="contained" color="primary" size="small"
                disabled={!newRoundTitle.trim()} onClick={createRound}
                startIcon={<Add sx={{fontSize:14}}/>}
                sx={{fontSize:12,textTransform:'none',fontWeight:700}}>
                Create Round
              </Button>
            </Box>
          </Box>
        </Box>
      </Collapse>

      {/* ── NOTES ─────────────────────────────────────────────────────────── */}
      {(notes.length>0||showNoteForm)&&(
        <Box sx={{border:`1.5px solid ${PURPLE}25`,borderRadius:2,overflow:'hidden',mb:3}}>
          <Box sx={{px:2.5,py:1.5,bgcolor:'#F5F3FF',borderBottom:'1px solid #DDD6FE',
            display:'flex',alignItems:'center',gap:1}}>
            <NoteAlt sx={{color:PURPLE,fontSize:16}}/>
            <Typography sx={{fontSize:12,fontWeight:700,color:'#4C1D95',flex:1}}>Interview Notes</Typography>
            {notes.length>0&&<Chip label={`${notes.length} note${notes.length>1?'s':''}`} size="small"
              sx={{height:18,fontSize:10,bgcolor:PURPLE+'18',color:PURPLE,borderRadius:1}}/>}
          </Box>
          <Box sx={{p:2,bgcolor:CARD}}>
            {notes.map(n=>(
              <Box key={n.id} sx={{mb:1.5,p:1.5,bgcolor:BG,borderRadius:1.5,
                border:`1px solid ${BORDER}`,borderLeft:`3px solid ${PURPLE}`}}>
                <Box sx={{display:'flex',alignItems:'center',gap:1,mb:0.4,flexWrap:'wrap'}}>
                  <Avatar sx={{width:20,height:20,fontSize:9,fontWeight:700,
                    bgcolor:PURPLE+'25',color:PURPLE}}>
                    {n.addedBy.split(' ').map(w=>w[0]).join('').slice(0,2)}
                  </Avatar>
                  <Typography sx={{fontSize:12,fontWeight:700,color:TEXT1}}>{n.addedBy}</Typography>
                  <Chip label={n.addedByRole} size="small"
                    sx={{height:16,fontSize:9,bgcolor:PURPLE+'12',color:PURPLE,borderRadius:1}}/>
                  <Typography sx={{fontSize:10,color:TEXT3,ml:'auto'}}>
                    {new Date(n.addedAt).toLocaleDateString('en-US',
                      {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </Typography>
                </Box>
                <Typography sx={{fontSize:12,color:TEXT2,lineHeight:1.6}}>{n.text}</Typography>
              </Box>
            ))}
            <Collapse in={showNoteForm}>
              <Box sx={{display:'flex',alignItems:'flex-start',gap:1.5,
                borderTop:notes.length>0?`1px solid ${BORDER}`:'none',
                pt:notes.length>0?2:0}}>
                <Avatar sx={{width:26,height:26,fontSize:10,fontWeight:700,mt:0.5,flexShrink:0,
                  bgcolor:ORANGE+'25',color:ORANGE}}>
                  {authName.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </Avatar>
                <Box sx={{flex:1}}>
                  <TextField fullWidth multiline rows={2} size="small"
                    placeholder={`Add note as ${authName} (${authRoleLabel})…`}
                    value={noteText} onChange={e=>setNoteText(e.target.value)}
                    onKeyDown={e=>{if(e.ctrlKey&&e.key==='Enter')addNote()}}
                    sx={{mb:1,'& .MuiOutlinedInput-root':{fontSize:13,bgcolor:BG}}}/>
                  <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <Typography sx={{fontSize:10,color:TEXT3}}>Ctrl+Enter to save</Typography>
                    <Button variant="contained" color="primary" size="small"
                      disabled={!noteText.trim()} onClick={addNote}
                      sx={{fontSize:11,textTransform:'none',fontWeight:600}}>Add Note</Button>
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </Box>
        </Box>
      )}

      {/* ── INTERVIEW ROUNDS ──────────────────────────────────────────────── */}
      {rounds.length>0 ? (
        <Box>
          <Box sx={{display:'flex',alignItems:'center',gap:1,mb:1.5}}>
            <Typography sx={{fontSize:10,fontWeight:700,color:TEXT3,
              textTransform:'uppercase',letterSpacing:'0.1em',flex:1}}>
              Interview Rounds ({rounds.length})
            </Typography>
          </Box>
          {rounds.map(r=>(
            <RoundCard key={r.id} round={r}
              allEvals={allEvals}
              authName={authName} authEmail={authEmail}
              authRole={authRole} authRoleLabel={authRoleLabel}
              submitterOptions={submitterOptions}
              jobId={jobId} jobTitle={jobTitle}
              candidateId={candidateId} candidateName={candidateName}
              onRoundChange={refreshRounds}
            />
          ))}
        </Box>
      ) : isShortlisted ? (
        <Box sx={{textAlign:'center',py:5,bgcolor:BG,borderRadius:2,border:`1px dashed ${BORDER}`}}>
          <Groups sx={{fontSize:40,color:TEXT3,mb:1}}/>
          <Typography sx={{color:TEXT2,fontWeight:500,fontSize:13}}>
            No interview rounds created yet
          </Typography>
          <Typography sx={{fontSize:11,color:TEXT3,mt:0.5,mb:2}}>
            Click "Add Round" to create the first interview round
          </Typography>
          <Button variant="contained" color="primary" size="small"
            startIcon={<Add sx={{fontSize:14}}/>} onClick={openAddRound}
            sx={{fontSize:12,textTransform:'none',fontWeight:700}}>
            Add First Round
          </Button>
        </Box>
      ) : (
        <Box sx={{textAlign:'center',py:5,bgcolor:BG,borderRadius:2,border:`1px dashed ${BORDER}`}}>
          <HowToReg sx={{fontSize:40,color:TEXT3,mb:1}}/>
          <Typography sx={{color:TEXT2,fontWeight:500,fontSize:13}}>
            Shortlist this candidate to begin the interview process
          </Typography>
        </Box>
      )}
    </Box>
  )
}
