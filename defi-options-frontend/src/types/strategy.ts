// Файл: src/types/strategy.ts (Новий)

export type OptionSide = 'BUY' | 'SELL';
export type OptionType = 'CALL' | 'PUT';

export interface StrategyLeg {
  id: string; // Унікальний ID для React
  seriesId: string; // ID опціонної серії з GraphQL
  side: OptionSide; 
  size: number; // Кількість контрактів
  strike: number; // Ціна виконання
  expiryDate: string; // Дата експірації
  // Премія, сплачена/отримана (для розрахунку P&L)
  premium: number; 
}

export interface Strategy {
  name: string;
  legs: StrategyLeg[];
}