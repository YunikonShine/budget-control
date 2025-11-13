export type Card = { id: string; title: string; order: number; columnId: string };
export type Column = { id: string; name: string; order: number; cards: Card[] };
