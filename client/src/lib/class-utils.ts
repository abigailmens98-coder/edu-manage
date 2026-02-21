/**
 * Sorts class names in a logical order:
 * 1. KG 1, KG 2...
 * 2. Basic 1, Basic 2...
 * 3. Others alphabetical
 *
 * It extracts numbers and suffixes (e.g., "Basic 4D") for accurate ordering.
 * Comparison is case-insensitive.
 */
export function sortClassNames(a: string, b: string): number {
    const getWeight = (cls: string) => {
        const upper = cls.toUpperCase();
        if (upper.startsWith("KG")) return 1;
        if (upper.startsWith("BASIC")) return 2;
        return 3;
    };

    const weightA = getWeight(a);
    const weightB = getWeight(b);

    if (weightA !== weightB) return weightA - weightB;

    // Same group, extract number and suffix
    const extract = (cls: string) => {
        const numMatch = cls.match(/\d+/);
        const num = numMatch ? parseInt(numMatch[0]) : 0;

        // Suffix is everything after the number (e.g. "D" in "Basic 4D")
        // or the whole string if no number
        let suffix = cls.toUpperCase();
        if (numMatch) {
            suffix = cls.slice(numMatch.index! + numMatch[0].length).trim().toUpperCase();
        }

        return { num, suffix };
    };

    const dataA = extract(a);
    const dataB = extract(b);

    if (dataA.num !== dataB.num) return dataA.num - dataB.num;
    return dataA.suffix.localeCompare(dataB.suffix);
}
