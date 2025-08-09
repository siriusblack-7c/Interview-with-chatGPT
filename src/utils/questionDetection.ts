// Question detection patterns
export const QUESTION_PATTERNS = {
    // Question words that typically start questions
    questionWords: ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'whose', "what's", "how's", "why's", "when's", "where's", "who's", "which's", "whose's"],
    // Modal verbs that often indicate questions
    modalVerbs: ['can', 'could', 'would', 'should', 'might', 'may', 'must', 'will'],
    // Phrases that indicate questions
    questionPhrases: ['do you', 'can you', 'could you', 'would you', 'should you', 'tell me', 'please tell'],
    // Question mark
    endsWithQuestion: (text: string) => text.trim().endsWith('?')
};

/**
 * Detects if a given text is likely a question
 * @param text - The text to analyze
 * @returns true if the text appears to be a question
 */
export const isQuestion = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    console.log('Checking if question:', lowerText);

    // Check if it ends with question mark
    if (QUESTION_PATTERNS.endsWithQuestion(lowerText)) {
        console.log('✅ Ends with question mark');
        return true;
    }

    // Check for question words at the beginning
    const words = lowerText.split(' ');
    if (QUESTION_PATTERNS.questionWords.some(word => words[0] === word)) {
        console.log('✅ Starts with question word:', words[0]);
        return true;
    }

    // Check for modal verbs followed by a subject
    if (QUESTION_PATTERNS.modalVerbs.some(verb => words[0] === verb)) {
        console.log('✅ Starts with modal verb:', words[0]);
        return true;
    }

    // Check for question phrases
    if (QUESTION_PATTERNS.questionPhrases.some(phrase => lowerText.includes(phrase))) {
        console.log('✅ Contains question phrase');
        return true;
    }

    console.log('❌ Not detected as question');
    return false;
};
