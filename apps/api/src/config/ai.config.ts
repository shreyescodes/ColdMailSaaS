import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organizationId: process.env.OPENAI_ORG_ID,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  features: {
    contentGeneration: process.env.AI_CONTENT_GENERATION === 'true',
    subjectLineGeneration: process.env.AI_SUBJECT_LINE_GENERATION === 'true',
    personalization: process.env.AI_PERSONALIZATION === 'true',
    performanceAnalysis: process.env.AI_PERFORMANCE_ANALYSIS === 'true',
  },
  limits: {
    maxRequestsPerMinute: parseInt(process.env.AI_MAX_REQUESTS_PER_MINUTE || '10', 10),
    maxTokensPerRequest: parseInt(process.env.AI_MAX_TOKENS_PER_REQUEST || '2000', 10),
    maxVariantsPerTest: parseInt(process.env.AI_MAX_VARIANTS_PER_TEST || '5', 10),
  },
  templates: {
    contentPrompt: process.env.AI_CONTENT_PROMPT || 'You are an expert cold email copywriter specializing in B2B outreach.',
    subjectLinePrompt: process.env.AI_SUBJECT_LINE_PROMPT || 'You are an expert email subject line writer.',
    personalizationPrompt: process.env.AI_PERSONALIZATION_PROMPT || 'You are an expert at personalizing email content.',
    analysisPrompt: process.env.AI_ANALYSIS_PROMPT || 'You are an expert email marketing analyst.',
  },
}));
