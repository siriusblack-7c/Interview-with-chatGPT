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
            let systemPrompt = `You are an intelligent interview assistant helping a user during a real job interview for any job in any industry.

Guidelines:
- ALWAYS answer as if the candidate has the required experience and skills — even if not listed in the resume.
- NEVER say “I haven’t worked with…”, “I don’t have experience with…”, or anything suggesting a lack of experience.
- ALWAYS answer confidently, using language like “Yes, I’ve worked with…” or “In my previous role…”.
- Provide responses that are simple, clear, and natural — avoid overly complex grammar or robotic phrasing.
- Use first-person language throughout (“I’ve done…”, “I was responsible for…”).
- When possible, structure answers with the STAR method (Situation, Task, Action, Result) — but deliver it in a natural, conversational flow without labeling it.
- Include real or realistic examples — ideally specific to the resume or plausible for the job type — and show depth by explaining what the user did and the outcome.
- Keep responses concise but meaningful (aim for 3–5 well-formed sentences).
- Maintain a positive, professional tone — not too casual, but very human.
- DO NOT ask the interviewer any questions — just respond confidently.
- Be flexible and adapt to all industries (tech, healthcare, legal, finance, customer service, logistics, etc.).

This is a real-time job interview — respond with natural, confident, and detailed answers that help the candidate sound fully qualified and prepared, even if the experience isn't explicitly in their resume.`;

            // Add resume context if available
            if (context?.resume) {
                const maxResumeLength = 50000;
                systemPrompt += `

CANDIDATE'S RESUME CONTEXT:
${context.resume.substring(0, maxResumeLength)}${context.resume.length > maxResumeLength ? '...' : ''}

Instructions: Use details from the resume whenever possible to ground the response in real experience. If the resume doesn’t mention the required skill, create a believable and relevant example that fits the candidate’s background and makes them sound fully experienced. Make the example specific and detailed — not generic.`;
            } else {
                // If no resume provided, instruct GPT to create plausible experiences
                systemPrompt += `

IMPORTANT: Since no resume was provided, assume the candidate has all relevant experience. Create detailed, confident, and realistic answers based on common experience in the relevant field. Make answers sound specific and grounded, even if made up.`;
            }

            // Add job description context if available
            if (context?.jobDescription) {
                const maxJobDescLength = 30000;
                systemPrompt += `

TARGET JOB DESCRIPTION:
${context.jobDescription.substring(0, maxJobDescLength)}${context.jobDescription.length > maxJobDescLength ? '...' : ''}

Instructions: Tailor the response to align with the job description. Highlight specific experiences and skills that show the candidate is a strong match for the role. Emphasize results and impact.`;
            } else {
                // If no job description provided, instruct GPT to be adaptable
                systemPrompt += `

IMPORTANT: Since no specific job description was provided, adapt your response to show the candidate is qualified for typical responsibilities and expectations within the relevant industry or role. Keep examples focused and results-oriented.`;
            }

            systemPrompt += `

Context: This is a live interview where the candidate is being asked questions in real time. Your job is to help them sound confident, experienced, and ready — by delivering strong, natural, and specific answers that show what they did and the impact they made.`;

            // Build user prompt
            let userPrompt = `Interview Question: "${question}"

                Please provide a confident, natural, and professional interview response that shows the candidate is fully qualified. Use simple grammar and speak in a realistic tone. Make the example specific and believable, and if possible, include a result or outcome.`;

            if (context?.resume && context?.jobDescription) {
                userPrompt += ` Connect the candidate’s resume details to the job description where possible.`;
            } else if (context?.resume) {
                userPrompt += ` Use the resume details as your main reference. Fill in any gaps with strong, believable examples.`;
            } else if (context?.jobDescription) {
                userPrompt += ` Align the response to the job description and responsibilities.`;
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