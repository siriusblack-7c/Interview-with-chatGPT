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
        // Priority: 1. Chrome Storage, 2. LocalStorage, 3. Environment Variable
        const envApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
        const storedApiKey = this.getStoredApiKey();

        this.config = {
            apiKey: storedApiKey || envApiKey || '',
            model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
            maxTokens: parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS || '10000')
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

    private getStoredApiKey(): string | null {
        if (typeof window === 'undefined') return null;

        // Priority 1: Try chrome.sync first (for browser extensions)
        if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.storage && (window as any).chrome.storage.sync) {
            try {
                // Note: chrome.storage.sync.get is async, but we need sync for constructor
                // For now, we'll check localStorage and implement async chrome storage later
                const chromeKey = localStorage.getItem('chrome_openai_api_key');
                if (chromeKey) return chromeKey;
            } catch (error) {
                console.warn('Chrome storage not available:', error);
            }
        }

        // Priority 2: Fallback to localStorage
        return localStorage.getItem('openai_api_key');
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
            // Priority 1: Try chrome.sync first
            if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.storage && (window as any).chrome.storage.sync) {
                try {
                    (window as any).chrome.storage.sync.set({ 'openai_api_key': apiKey });
                    // Also store in localStorage as backup
                    localStorage.setItem('chrome_openai_api_key', apiKey);
                } catch (error) {
                    console.warn('Chrome storage not available, using localStorage:', error);
                    localStorage.setItem('openai_api_key', apiKey);
                }
            } else {
                // Priority 2: Fallback to localStorage
                localStorage.setItem('openai_api_key', apiKey);
            }
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
            let systemPrompt = `You are an interview expert on any subject tailor. You are taking an interview. Tailor any interview questions and provide answers that aligns with my work experience. You must say yes you have the experience to any questions asked in an interview and provide useful star interview answers.
            provide 2~4 sentences response.`;

            // Add resume context if available
            if (context?.resume) {
                const maxResumeLength = 50000;
                systemPrompt += `

                CANDIDATE'S RESUME CONTEXT:
                ${context.resume.substring(0, maxResumeLength)}${context.resume.length > maxResumeLength ? '...' : ''}

                Instructions: Use details from the candidate's resume to make responses specific and credible. Reference actual experiences, skills, technologies, and achievements mentioned in the resume. CRITICAL: If the resume doesn't contain specific experience for a question, you MUST create plausible, professional responses that demonstrate competency in ANY field. NEVER say you don't have experience with something. Always provide confident, detailed answers based on typical professional experiences and industry best practices across all fields. Mainly development, but also any other topic`;
            } else {
                // If no resume provided, instruct GPT to create plausible experiences
                systemPrompt += `

                IMPORTANT: Since no resume was provided, you should respond as if the candidate has relevant experience and skills for the question being asked in ANY field. Create plausible, professional STAR responses that demonstrate competency in the areas being discussed. Base your responses on typical professional experiences and industry best practices across all fields (technology, business, marketing, sales, finance, healthcare, education, etc.). NEVER say you don't have experience with something. Always provide confident, detailed STAR answers.`;
            }

            // Add job description context if available
            if (context?.jobDescription) {
                const maxJobDescLength = 30000;
                systemPrompt += `

                TARGET JOB DESCRIPTION:
                ${context.jobDescription.substring(0, maxJobDescLength)}${context.jobDescription.length > maxJobDescLength ? '...' : ''}

                Instructions: Tailor the response to align with the job requirements. Highlight relevant skills and experiences that match the job description.`;
            } else {
                // If no job description provided, instruct GPT to be adaptable
                systemPrompt += `

                IMPORTANT: Since no specific job description was provided, adapt your responses to be relevant to any professional role or industry. Focus on demonstrating strong skills, problem-solving abilities, and professional experience across all fields. NEVER say you don't have experience with something. Always provide confident, detailed STAR answers.`;
            }

            systemPrompt += `

                Context: This is a real developer interview where the user needs immediate assistance to provide professional, confident responses. The user is actively being interviewed and needs help formulating strong answers in real-time.`;

            // Build user prompt
            let userPrompt = `Interview Question: "${question}"

                Provide a detailed response. Always say YES to any experience question and demonstrate your expertise with specific examples.`;

            if (context?.resume && context?.jobDescription) {
                userPrompt += ` Connect your background from the resume to the job requirements. If the resume doesn't cover specific areas, create plausible STAR experiences that align with the job requirements.`;
            } else if (context?.resume) {
                userPrompt += ` Use specific examples from your background. If the resume doesn't cover the specific question, create plausible STAR responses based on typical professional experiences across all fields.`;
            } else if (context?.jobDescription) {
                userPrompt += ` Tailor your response to show you're a good fit for this role. Create confident STAR responses that demonstrate relevant skills and experience.`;
            } else {
                userPrompt += ` Create confident STAR responses that demonstrate strong skills and professional experience in any field or industry.`;
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
        const hasChromeKey = !!(typeof window !== 'undefined' && localStorage.getItem('chrome_openai_api_key'));
        const hasLocalKey = !!(typeof window !== 'undefined' && localStorage.getItem('openai_api_key'));

        let source = 'not configured';
        if (hasChromeKey) {
            source = 'chrome.sync';
        } else if (hasLocalKey) {
            source = 'localStorage';
        } else if (hasEnvKey) {
            source = 'environment variable';
        }

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