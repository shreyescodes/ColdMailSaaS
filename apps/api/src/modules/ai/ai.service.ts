import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

export interface ContentSuggestionRequest {
  industry: string;
  targetRole: string;
  companySize: string;
  painPoints: string[];
  valueProposition: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  length: 'short' | 'medium' | 'long';
}

export interface SubjectLineRequest {
  industry: string;
  targetRole: string;
  painPoints: string[];
  valueProposition: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  count: number;
}

export interface PersonalizationRequest {
  contactInfo: {
    firstName: string;
    lastName: string;
    company: string;
    jobTitle: string;
    industry: string;
  };
  campaignContext: {
    industry: string;
    painPoints: string[];
    valueProposition: string;
  };
  template: string;
}

export interface ContentSuggestion {
  subject: string;
  opening: string;
  body: string;
  closing: string;
  callToAction: string;
  followUp: string;
  tags: string[];
  confidence: number;
}

export interface SubjectLineSuggestion {
  subject: string;
  reasoning: string;
  confidence: number;
  category: 'benefit' | 'curiosity' | 'urgency' | 'personalization' | 'question';
}

export interface PersonalizationResult {
  personalizedContent: string;
  variables: Record<string, string>;
  suggestions: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        organization: this.configService.get<string>('OPENAI_ORG_ID'),
      });
    }
  }

  async generateContentSuggestions(request: ContentSuggestionRequest): Promise<ContentSuggestion[]> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API not configured');
    }

    try {
      const prompt = this.buildContentPrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cold email copywriter specializing in B2B outreach. Generate compelling, personalized email content that addresses specific pain points and offers clear value.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('Failed to generate content');
      }

      return this.parseContentResponse(content);
    } catch (error) {
      this.logger.error('Failed to generate content suggestions:', error);
      throw new BadRequestException('Failed to generate content suggestions');
    }
  }

  async generateSubjectLines(request: SubjectLineRequest): Promise<SubjectLineSuggestion[]> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API not configured');
    }

    try {
      const prompt = this.buildSubjectLinePrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email subject line writer. Generate compelling, personalized subject lines that increase open rates for cold emails.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('Failed to generate subject lines');
      }

      return this.parseSubjectLineResponse(content);
    } catch (error) {
      this.logger.error('Failed to generate subject lines:', error);
      throw new BadRequestException('Failed to generate subject lines');
    }
  }

  async personalizeContent(request: PersonalizationRequest): Promise<PersonalizationResult> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API not configured');
    }

    try {
      const prompt = this.buildPersonalizationPrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at personalizing email content. Replace generic placeholders with specific, relevant information about the contact while maintaining the original message structure and tone.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('Failed to personalize content');
      }

      return this.parsePersonalizationResponse(content, request);
    } catch (error) {
      this.logger.error('Failed to personalize content:', error);
      throw new BadRequestException('Failed to personalize content');
    }
  }

  async analyzeEmailPerformance(emailContent: string, metrics: any): Promise<{
    score: number;
    suggestions: string[];
    improvements: string[];
  }> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API not configured');
    }

    try {
      const prompt = `Analyze this cold email content and provide performance insights:

Email Content:
${emailContent}

Metrics:
- Open Rate: ${metrics.openRate || 'N/A'}%
- Click Rate: ${metrics.clickRate || 'N/A'}%
- Reply Rate: ${metrics.replyRate || 'N/A'}%

Please provide:
1. Overall score (1-10)
2. Specific suggestions for improvement
3. Areas that are working well

Format as JSON with keys: score, suggestions, improvements`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email marketing analyst. Analyze email content and provide actionable insights for improvement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 600,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('Failed to analyze email performance');
      }

      return this.parseAnalysisResponse(content);
    } catch (error) {
      this.logger.error('Failed to analyze email performance:', error);
      throw new BadRequestException('Failed to analyze email performance');
    }
  }

  private buildContentPrompt(request: ContentSuggestionRequest): string {
    return `Generate a cold email for:
Industry: ${request.industry}
Target Role: ${request.targetRole}
Company Size: ${request.companySize}
Pain Points: ${request.painPoints.join(', ')}
Value Proposition: ${request.valueProposition}
Tone: ${request.tone}
Length: ${request.length}

Please provide:
1. Subject line
2. Opening hook
3. Main body content
4. Closing
5. Call to action
6. Follow-up suggestion
7. Relevant tags
8. Confidence score (1-10)

Format as JSON with keys: subject, opening, body, closing, callToAction, followUp, tags, confidence`;
  }

  private buildSubjectLinePrompt(request: SubjectLineRequest): string {
    return `Generate ${request.count} subject lines for a cold email about:
Industry: ${request.industry}
Target Role: ${request.targetRole}
Pain Points: ${request.painPoints.join(', ')}
Value Proposition: ${request.valueProposition}
Tone: ${request.tone}

For each subject line, provide:
1. The subject line text
2. Reasoning behind it
3. Confidence score (1-10)
4. Category (benefit, curiosity, urgency, personalization, question)

Format as JSON array with objects containing: subject, reasoning, confidence, category`;
  }

  private buildPersonalizationPrompt(request: PersonalizationRequest): string {
    return `Personalize this email template for a specific contact:

Contact Info:
- Name: ${request.contactInfo.firstName} ${request.contactInfo.lastName}
- Company: ${request.contactInfo.company}
- Job Title: ${request.contactInfo.jobTitle}
- Industry: ${request.contactInfo.industry}

Campaign Context:
- Industry: ${request.campaignContext.industry}
- Pain Points: ${request.campaignContext.painPoints.join(', ')}
- Value Proposition: ${request.campaignContext.valueProposition}

Template:
${request.template}

Please:
1. Replace generic placeholders with specific information
2. Add relevant personalization touches
3. Maintain the original structure and tone
4. Provide suggestions for additional personalization

Format as JSON with keys: personalizedContent, variables, suggestions`;
  }

  private parseContentResponse(content: string): ContentSuggestion[] {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [parsed];
    } catch (error) {
      this.logger.error('Failed to parse content response:', error);
      throw new BadRequestException('Invalid content response format');
    }
  }

  private parseSubjectLineResponse(content: string): SubjectLineSuggestion[] {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [parsed];
    } catch (error) {
      this.logger.error('Failed to parse subject line response:', error);
      throw new BadRequestException('Invalid subject line response format');
    }
  }

  private parsePersonalizationResponse(content: string, request: PersonalizationRequest): PersonalizationResult {
    try {
      const parsed = JSON.parse(content);
      return {
        personalizedContent: parsed.personalizedContent || request.template,
        variables: parsed.variables || {},
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse personalization response:', error);
      throw new BadRequestException('Invalid personalization response format');
    }
  }

  private parseAnalysisResponse(content: string): {
    score: number;
    suggestions: string[];
    improvements: string[];
  } {
    try {
      const parsed = JSON.parse(content);
      return {
        score: parsed.score || 5,
        suggestions: parsed.suggestions || [],
        improvements: parsed.improvements || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse analysis response:', error);
      throw new BadRequestException('Invalid analysis response format');
    }
  }

  isConfigured(): boolean {
    return !!this.openai;
  }
}
