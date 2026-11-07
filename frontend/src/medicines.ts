export const MEDICINES = ['TB medicines', 'Dengue medicines'] as const

export type Medicine = (typeof MEDICINES)[number]
