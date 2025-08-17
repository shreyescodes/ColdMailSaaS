import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import { TrendingUp, Visibility, Click, Reply } from '@mui/icons-material';

export const AnalyticsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        Analytics & Reporting
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Campaign Performance
              </Typography>
              <Typography color="textSecondary">
                Track your email campaign metrics and performance over time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Engagement Analytics
              </Typography>
              <Typography color="textSecondary">
                Monitor open rates, click rates, and reply rates across campaigns.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
