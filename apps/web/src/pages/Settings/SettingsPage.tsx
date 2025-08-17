import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import { Settings, Security, Notifications, AccountCircle } from '@mui/icons-material';

export const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountCircle sx={{ mr: 1 }} />
                <Typography variant="h6">Profile Settings</Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Update your personal information and preferences.
              </Typography>
              <Button variant="outlined" sx={{ mt: 1 }}>
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ mr: 1 }} />
                <Typography variant="h6">Security</Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Manage your password and security settings.
              </Typography>
              <Button variant="outlined" sx={{ mt: 1 }}>
                Security Settings
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Notifications sx={{ mr: 1 }} />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Configure your notification preferences.
              </Typography>
              <Button variant="outlined" sx={{ mt: 1 }}>
                Notification Settings
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Settings sx={{ mr: 1 }} />
                <Typography variant="h6">Organization</Typography>
              </Box>
              <Typography color="textSecondary" gutterBottom>
                Manage organization settings and team members.
              </Typography>
              <Button variant="outlined" sx={{ mt: 1 }}>
                Organization Settings
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
