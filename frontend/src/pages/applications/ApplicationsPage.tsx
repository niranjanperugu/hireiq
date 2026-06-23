import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Rating,
  Tabs,
  Tab
} from '@mui/material'
import { Visibility as ViewIcon } from '@mui/icons-material'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}

const ApplicationsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<any>(null)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const applicationStatusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
    'APPLIED': 'default',
    'SCREENED': 'primary',
    'SHORTLISTED': 'info',
    'INTERVIEW_ROUND_1': 'info',
    'INTERVIEW_ROUND_2': 'info',
    'FINAL_INTERVIEW': 'warning',
    'OFFER_RELEASED': 'warning',
    'HIRED': 'success',
    'REJECTED': 'error'
  }

  // Mock data for demo
  const mockApplications = [
    {
      id: '1',
      candidateName: 'John Doe',
      jobTitle: 'Senior Developer',
      status: 'SHORTLISTED',
      similarityScore: 85,
      appliedDate: '2026-06-15',
      interviewsCompleted: 1
    },
    {
      id: '2',
      candidateName: 'Jane Smith',
      jobTitle: 'Product Manager',
      status: 'INTERVIEW_ROUND_2',
      similarityScore: 92,
      appliedDate: '2026-06-14',
      interviewsCompleted: 1
    },
    {
      id: '3',
      candidateName: 'Bob Johnson',
      jobTitle: 'Senior Developer',
      status: 'APPLIED',
      similarityScore: 65,
      appliedDate: '2026-06-13',
      interviewsCompleted: 0
    }
  ]

  const handleViewDetails = (app: any) => {
    setSelectedApp(app)
    setDetailOpen(true)
  }

  const ApplicationCard = ({ app }: { app: any }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {app.candidateName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {app.jobTitle}
            </Typography>
          </Box>
          <Chip
            label={app.status.replace(/_/g, ' ')}
            color={applicationStatusColors[app.status]}
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="textSecondary">
              Match Score
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {app.similarityScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={app.similarityScore}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            Applied: {app.appliedDate}
          </Typography>
          <Rating
            value={app.interviewsCompleted}
            max={3}
            readOnly
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          startIcon={<ViewIcon />}
          onClick={() => handleViewDetails(app)}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  )

  const groupedApplications = {
    applied: mockApplications.filter(a => a.status === 'APPLIED'),
    interviewing: mockApplications.filter(a => ['SCREENED', 'SHORTLISTED', 'INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2', 'FINAL_INTERVIEW'].includes(a.status)),
    offered: mockApplications.filter(a => ['OFFER_RELEASED'].includes(a.status)),
    hired: mockApplications.filter(a => a.status === 'HIRED')
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Applications Pipeline
      </Typography>

      {/* Tabs for different views */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Pipeline" />
          <Tab label="All Applications" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* Pipeline Grid View */}
        <Grid container spacing={2}>
          {[
            { title: 'Applied', apps: groupedApplications.applied },
            { title: 'Interviewing', apps: groupedApplications.interviewing },
            { title: 'Offered', apps: groupedApplications.offered },
            { title: 'Hired', apps: groupedApplications.hired }
          ].map(column => (
            <Grid item xs={12} sm={6} md={3} key={column.title}>
              <Card sx={{ backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    {column.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {column.apps.length} candidates
                  </Typography>
                  {column.apps.map(app => (
                    <ApplicationCard key={app.id} app={app} />
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* List View */}
        {mockApplications.map(app => (
          <ApplicationCard key={app.id} app={app} />
        ))}
      </TabPanel>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedApp?.candidateName}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Job Title
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
              {selectedApp?.jobTitle}
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Match Score
            </Typography>
            <LinearProgress
              variant="determinate"
              value={selectedApp?.similarityScore || 0}
              sx={{ mb: 2, height: 8, borderRadius: 1 }}
            />

            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Current Status
            </Typography>
            <Chip
              label={selectedApp?.status?.replace(/_/g, ' ')}
              color={applicationStatusColors[selectedApp?.status]}
              sx={{ mb: 3 }}
            />

            <Typography variant="body2" color="textSecondary">
              Interviews Completed: {selectedApp?.interviewsCompleted}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          <Button variant="contained">Schedule Interview</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ApplicationsPage
