import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add,
  Campaign,
  People,
  Analytics,
  Workflow,
  Email,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const quickActions = [
  {
    title: 'Create Campaign',
    description: 'Start a new email campaign',
    icon: <Campaign />,
    action: '/campaigns/new',
    color: 'primary',
  },
  {
    title: 'Add Contacts',
    description: 'Import or manually add contacts',
    icon: <People />,
    action: '/contacts/new',
    color: 'success',
  },
  {
    title: 'View Analytics',
    description: 'Check campaign performance',
    icon: <Analytics />,
    action: '/analytics',
    color: 'info',
  },
  {
    title: 'Create Workflow',
    description: 'Set up automation workflows',
    icon: <Workflow />,
    action: '/workflows/new',
    color: 'warning',
  },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    navigate(path);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <List>
          {quickActions.map((action, index) => (
            <React.Fragment key={action.title}>
              <ListItem
                button
                onClick={() => handleAction(action.action)}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: `${action.color}.light`,
                    '& .MuiListItemIcon-root': {
                      color: `${action.color}.main`,
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: `${action.color}.main` }}>
                  {action.icon}
                </ListItemIcon>
                <ListItemText
                  primary={action.title}
                  secondary={action.description}
                  primaryTypographyProps={{ fontWeight: 'medium' }}
                />
              </ListItem>
              {index < quickActions.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Add />}
            onClick={() => navigate('/campaigns/new')}
            sx={{ mb: 1 }}
          >
            New Campaign
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<People />}
            onClick={() => navigate('/contacts/new')}
          >
            Add Contacts
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
