import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Campaign,
  People,
  Email,
  TrendingUp,
  Refresh,
  Visibility,
  Click,
  Reply,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../services/api';
import { DashboardChart } from './components/DashboardChart';
import { RecentActivity } from './components/RecentActivity';
import { QuickActions } from './components/QuickActions';

export const DashboardPage: React.FC = () => {
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: analyticsAPI.getDashboardSummary,
  });

  const handleRefresh = () => {
    refetch();
  };

  const metricCards = [
    {
      title: 'Total Campaigns',
      value: dashboardData?.analytics?.totalCampaigns || 0,
      icon: <Campaign />,
      color: 'primary',
      change: '+12%',
      changePositive: true,
    },
    {
      title: 'Active Contacts',
      value: dashboardData?.analytics?.totalContacts || 0,
      icon: <People />,
      color: 'success',
      change: '+8%',
      changePositive: true,
    },
    {
      title: 'Emails Sent',
      value: dashboardData?.analytics?.totalEmailsSent || 0,
      icon: <Email />,
      color: 'info',
      change: '+15%',
      changePositive: true,
    },
    {
      title: 'Open Rate',
      value: `${dashboardData?.analytics?.averageOpenRate || 0}%`,
      icon: <Visibility />,
      color: 'warning',
      change: '+2.5%',
      changePositive: true,
    },
  ];

  const performanceMetrics = [
    {
      label: 'Click Rate',
      value: dashboardData?.analytics?.averageClickRate || 0,
      target: 3.0,
      color: 'primary',
    },
    {
      label: 'Reply Rate',
      value: dashboardData?.analytics?.averageReplyRate || 0,
      target: 2.0,
      color: 'success',
    },
    {
      label: 'Bounce Rate',
      value: dashboardData?.analytics?.averageBounceRate || 0,
      target: 2.0,
      color: 'error',
      inverse: true,
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={isLoading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {card.value}
                    </Typography>
                    <Chip
                      label={card.change}
                      size="small"
                      color={card.changePositive ? 'success' : 'error'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box
                    sx={{
                      color: `${card.color}.main`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: `${card.color}.light`,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts and Performance */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Main Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Campaign Performance
              </Typography>
              <DashboardChart />
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Box sx={{ mt: 2 }}>
                {performanceMetrics.map((metric, index) => (
                  <Box key={index} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        {metric.label}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {metric.value}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((metric.value / metric.target) * 100, 100)}
                      color={metric.color as any}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      Target: {metric.target}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions and Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <QuickActions />
        </Grid>
        <Grid item xs={12} lg={8}>
          <RecentActivity />
        </Grid>
      </Grid>
    </Box>
  );
};
