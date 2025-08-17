import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Add, PlayArrow, Settings } from '@mui/icons-material';

export const WorkflowsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        Workflows & Automation
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Automation Workflows
          </Typography>
          <Typography color="textSecondary">
            Create and manage automated workflows to streamline your email marketing processes.
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" startIcon={<Add />}>
              Create Workflow
            </Button>
            <Button variant="outlined" startIcon={<PlayArrow />}>
              Run Workflow
            </Button>
            <Button variant="outlined" startIcon={<Settings />}>
              Workflow Settings
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
