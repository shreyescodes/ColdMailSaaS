import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import {
  Campaign,
  People,
  Email,
  TrendingUp,
  CheckCircle,
  Warning,
  Error,
} from '@mui/icons-material';

// Mock data - in real app this would come from API
const activities = [
  {
    id: '1',
    type: 'campaign',
    action: 'Campaign started',
    description: 'Q1 Outreach Campaign has been activated',
    timestamp: '2 hours ago',
    status: 'success',
    icon: <Campaign />,
    color: 'primary',
  },
  {
    id: '2',
    type: 'contacts',
    action: 'Contacts imported',
    description: '150 new contacts added from CSV import',
    timestamp: '4 hours ago',
    status: 'success',
    icon: <People />,
    color: 'success',
  },
  {
    id: '3',
    type: 'email',
    action: 'Email sent',
    description: 'Sequence email #2 sent to 45 contacts',
    timestamp: '6 hours ago',
    status: 'success',
    icon: <Email />,
    color: 'info',
  },
  {
    id: '4',
    type: 'analytics',
    action: 'Performance alert',
    description: 'Open rate dropped below 15% threshold',
    timestamp: '8 hours ago',
    status: 'warning',
    icon: <TrendingUp />,
    color: 'warning',
  },
  {
    id: '5',
    type: 'campaign',
    action: 'Campaign completed',
    description: 'Holiday Promotion finished successfully',
    timestamp: '1 day ago',
    status: 'success',
    icon: <Campaign />,
    color: 'success',
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle color="success" />;
    case 'warning':
      return <Warning color="warning" />;
    case 'error':
      return <Error color="error" />;
    default:
      return <CheckCircle color="success" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

export const RecentActivity: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <List>
          {activities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: `${activity.color}.light`, color: `${activity.color}.main` }}>
                    {activity.icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {activity.action}
                      </Typography>
                      {getStatusIcon(activity.status)}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {activity.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          {activity.timestamp}
                        </Typography>
                        <Chip
                          label={activity.type}
                          size="small"
                          color={getStatusColor(activity.status) as any}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
              {index < activities.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};
