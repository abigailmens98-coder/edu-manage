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
    if (!classLevel) return false;
    const jhsLevels = ["basic 7", "basic 8", "basic 9", "jhs 1", "jhs 2", "jhs 3"];
    const levelLower = classLevel.toLowerCase();
    return jhsLevels.some(level => levelLower.includes(level));
}
