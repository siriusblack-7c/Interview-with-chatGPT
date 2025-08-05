import OpenAI from 'openai';

interface OpenAIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
}

class OpenAIService {
    private client: OpenAI | null = null;
    private config: OpenAIConfig;

    constructor() {
        // Prioritize environment variable, then localStorage as fallback
        const envApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
        const storedApiKey = typeof window !== 'undefined' ? localStorage.getItem('openai_api_key') : null;

        this.config = {
            apiKey: envApiKey || storedApiKey || '',
            model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
            maxTokens: parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS || '500')
        };

        // Log configuration status for debugging
        console.log('🔑 OpenAI Configuration:', {
            hasEnvKey: !!envApiKey,
            hasStoredKey: !!storedApiKey,
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            configured: this.isConfigured()
        });

        this.initializeClient();
    }

    private initializeClient() {
        if (this.config.apiKey && this.config.apiKey !== 'your_openai_api_key_here') {
            this.client = new OpenAI({
                apiKey: this.config.apiKey,
                dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
            });
        } else {
            this.client = null;
        }
    }

    updateApiKey(apiKey: string) {
        this.config.apiKey = apiKey;
        if (typeof window !== 'undefined') {
            localStorage.setItem('openai_api_key', apiKey);
        }
        this.initializeClient();
    }

    isConfigured(): boolean {
        return this.client !== null && this.config.apiKey !== '' && this.config.apiKey !== 'your_openai_api_key_here';
    }

    async generateInterviewResponse(
        question: string,
        context?: {
            resume?: string;
            jobDescription?: string;
            additionalContext?: string;
        }
    ): Promise<string> {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env.local file.');
        }

        try {
            // Build personalized system prompt
            let systemPrompt = `You are an intelligent interview assistant helping someone practice for job interviews.

Guidelines:
- Provide professional, confident, and authentic responses
- Keep responses concise but comprehensive (2-4 sentences)
- Include specific examples when appropriate
- Maintain a positive and professional tone
- Focus on technical skills, soft skills, and career growth
- Use first person ("I have experience with...", "In my role at...")
- Don't ask questions, just answer the interview question`;

            // Add resume context if available
            if (context?.resume) {
                systemPrompt += `

CANDIDATE'S RESUME CONTEXT:
${context.resume.substring(0, 1500)}${context.resume.length > 1500 ? '...' : ''}

Instructions: Use details from the candidate's resume to make responses specific and credible. Reference actual experiences, skills, technologies, and achievements mentioned in the resume.`;
            }

            // Add job description context if available
            if (context?.jobDescription) {
                systemPrompt += `

TARGET JOB DESCRIPTION:
${context.jobDescription.substring(0, 1000)}${context.jobDescription.length > 1000 ? '...' : ''}

Instructions: Tailor the response to align with the job requirements. Highlight relevant skills and experiences that match the job description.`;
            }

            systemPrompt += `

Context: This is a practice interview session where the user is preparing for real interviews.`;

            // Build user prompt
            let userPrompt = `Interview Question: "${question}"

Please provide a professional interview response that demonstrates competency, confidence, and authenticity.`;

            if (context?.resume && context?.jobDescription) {
                userPrompt += ` Make sure to connect your background from the resume to the requirements in the job description.`;
            } else if (context?.resume) {
                userPrompt += ` Use specific examples and details from your background.`;
            } else if (context?.jobDescription) {
                userPrompt += ` Tailor your response to show you're a good fit for this role.`;
            }

            if (context?.additionalContext) {
                userPrompt += ` Additional context: ${context.additionalContext}`;
            }

            const response = await this.client!.chat.completions.create({
                model: this.config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.config.maxTokens,
                temperature: 0.7,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });

            const generatedResponse = response.choices[0]?.message?.content?.trim();

            if (!generatedResponse) {
                throw new Error('No response generated from OpenAI');
            }

            return generatedResponse;
        } catch (error: any) {
            console.error('OpenAI API error:', error);

            if (error.status === 401) {
                throw new Error('Invalid OpenAI API key. Please check your configuration.');
            } else if (error.status === 429) {
                throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
            } else if (error.status === 500) {
                throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
            } else {
                throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
            }
        }
    }

    async generateFollowUpQuestions(originalQuestion: string, response: string): Promise<string[]> {
        if (!this.isConfigured()) {
            return [];
        }

        try {
            const prompt = `Based on this interview question and response, suggest 2-3 relevant follow-up questions an interviewer might ask:

Original Question: "${originalQuestion}"
Response: "${response}"

Generate follow-up questions that dive deeper into the topic or explore related areas. Return as a simple list, one question per line.`;

            const response_obj = await this.client!.chat.completions.create({
                model: this.config.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.8
            });

            const followUps = response_obj.choices[0]?.message?.content?.trim();
            return followUps ? followUps.split('\n').filter(q => q.trim().length > 0) : [];
        } catch (error) {
            console.error('Error generating follow-up questions:', error);
            return [];
        }
    }

    getUsageInfo(): { configured: boolean; model: string; maxTokens: number; source: string } {
        const hasEnvKey = !!(import.meta.env.VITE_OPENAI_API_KEY);
        const hasStoredKey = !!(typeof window !== 'undefined' && localStorage.getItem('openai_api_key'));

        let source = 'not configured';
        if (hasEnvKey) source = 'environment variable';
        else if (hasStoredKey) source = 'localStorage';

        return {
            configured: this.isConfigured(),
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            source
        };
    }
}

export const openaiService = new OpenAIService();
export default openaiService;