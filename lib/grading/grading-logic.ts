
export interface PartIAnswer {
  questionIndex: number; // 1-18
  selectedOption: number | null; // 0:A, 1:B, 2:C, 3:D
}

export interface PartIIAnswer {
  questionIndex: number; // 1-4
  options: {
    a: boolean | null;
    b: boolean | null;
    c: boolean | null;
    d: boolean | null;
  };
}

export interface PartIIIAnswer {
  questionIndex: number; // 1-6
  value: string | null; // e.g., "-12.5"
}

export interface StudentSubmission {
  partI: Record<number, number | null>;
  partII: Record<number, Record<string, boolean | null>>;
  partIII: Record<number, string | null>;
  essayContent?: string;
  essayScore?: number;
}

export interface AnswerKey {
  partI: Record<number, number>;
  partII: Record<number, Record<string, boolean>>;
  partIII: Record<number, string>;
}

export const calculatePartIScore = (studentAnswers: Record<number, number | null>, key: Record<number, number>): number => {
  let score = 0;
  for (let i = 1; i <= 18; i++) {
    if (studentAnswers[i] === key[i]) {
      score += 0.25;
    }
  }
  return score;
};

export const calculatePartIIScore = (studentAnswers: Record<number, Record<string, boolean | null>>, key: Record<number, Record<string, boolean>>): number => {
  let totalScore = 0;
  
  // Scoring rules for Part II (Vietnamese Standard):
  // 1 correct sub-item: 0.1
  // 2 correct sub-items: 0.25
  // 3 correct sub-items: 0.5
  // 4 correct sub-items: 1.0
  
  for (let i = 1; i <= 4; i++) {
    const studentQ = studentAnswers[i] || {};
    const keyQ = key[i] || {};
    
    let correctCount = 0;
    ['a', 'b', 'c', 'd'].forEach(opt => {
      if (studentQ[opt] === keyQ[opt]) {
        correctCount++;
      }
    });
    
    if (correctCount === 1) totalScore += 0.1;
    else if (correctCount === 2) totalScore += 0.25;
    else if (correctCount === 3) totalScore += 0.5;
    else if (correctCount === 4) totalScore += 1.0;
  }
  
  return totalScore;
};

export const calculatePartIIIScore = (studentAnswers: Record<number, string | null>, key: Record<number, string>): number => {
  let score = 0;
  for (let i = 1; i <= 6; i++) {
    const studentVal = (studentAnswers[i] || "").trim();
    const keyVal = (key[i] || "").trim();
    if (studentVal === keyVal && studentVal !== "") {
      score += 0.25;
    }
  }
  return score;
};

export const calculateTotalScore = (submission: StudentSubmission, key: AnswerKey): {
  partI: number;
  partII: number;
  partIII: number;
  essay: number;
  total: number;
} => {
  const p1 = calculatePartIScore(submission.partI, key.partI);
  const p2 = calculatePartIIScore(submission.partII, key.partII);
  const p3 = calculatePartIIIScore(submission.partIII, key.partIII);
  const essay = submission.essayScore || 0;
  
  return {
    partI: p1,
    partII: p2,
    partIII: p3,
    essay: essay,
    total: Math.min(10, p1 + p2 + p3 + essay)
  };
};
