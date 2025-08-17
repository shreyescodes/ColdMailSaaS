import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Add, Upload, Download } from '@mui/icons-material';

export const ContactsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        Contacts
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Contact Management
          </Typography>
          <Typography color="textSecondary">
            Manage your contact lists, import/export contacts, and segment your audience.
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" startIcon={<Add />}>
              Add Contact
            </Button>
            <Button variant="outlined" startIcon={<Upload />}>
              Import Contacts
            </Button>
            <Button variant="outlined" startIcon={<Download />}>
              Export Contacts
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
