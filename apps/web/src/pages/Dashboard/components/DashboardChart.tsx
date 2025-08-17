import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Mock data - in real app this would come from API
const data = [
  { date: '2024-01-01', sent: 120, opened: 45, clicked: 12, replied: 3 },
  { date: '2024-01-02', sent: 150, opened: 67, clicked: 18, replied: 5 },
  { date: '2024-01-03', sent: 180, opened: 89, clicked: 25, replied: 7 },
  { date: '2024-01-04', sent: 200, opened: 112, clicked: 32, replied: 9 },
  { date: '2024-01-05', sent: 220, opened: 134, clicked: 38, replied: 11 },
  { date: '2024-01-06', sent: 250, opened: 156, clicked: 45, replied: 13 },
  { date: '2024-01-07', sent: 280, opened: 178, clicked: 52, replied: 15 },
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const DashboardChart: React.FC = () => {
  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) => formatDate(label)}
            formatter={(value: number, name: string) => [
              value,
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="sent"
            stackId="1"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
            name="Sent"
          />
          <Area
            type="monotone"
            dataKey="opened"
            stackId="1"
            stroke="#82ca9d"
            fill="#82ca9d"
            fillOpacity={0.6}
            name="Opened"
          />
          <Area
            type="monotone"
            dataKey="clicked"
            stackId="1"
            stroke="#ffc658"
            fill="#ffc658"
            fillOpacity={0.6}
            name="Clicked"
          />
          <Area
            type="monotone"
            dataKey="replied"
            stackId="1"
            stroke="#ff7300"
            fill="#ff7300"
            fillOpacity={0.6}
            name="Replied"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
