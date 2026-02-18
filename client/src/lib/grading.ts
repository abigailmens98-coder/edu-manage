// Shared grading logic using dynamic scales
export interface GradingScale {
    id: string;
    type: string;
    grade: string;
    minScore: number;
    maxScore: number;
    description: string;
}

export function getGradeFromScales(score: number, classLevel: string, scales: GradingScale[]) {
    const type = isJHS(classLevel) ? "jhs" : "primary";
    const relevantScales = scales.filter(s => s.type === type).sort((a, b) => b.minScore - a.minScore);

    const scale = relevantScales.find(s => score >= s.minScore && score <= s.maxScore);

    return scale || { grade: "N/A", description: "Out of range" };
}

export function isJHS(classLevel: string) {
    const jhsLevels = ["Basic 7", "Basic 8", "Basic 9", "JHS 1", "JHS 2", "JHS 3"];
    return jhsLevels.some(level => classLevel.includes(level));
}
