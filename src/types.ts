export const STAGES = ["Applied", "Screening", "Interview", "Offer"] as const;
export type Stage = (typeof STAGES)[number];
export type Candidate = { id: string; name: string; role: string; email: string; stage: Stage; score: number; notes: string; at: string; who: string };
