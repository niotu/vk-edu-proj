import { ChoiceMode } from '@prisma/client';

export const POINTS_CORRECT = 100;

interface OptionForScoring {
  id: string;
  isCorrect: boolean;
}

export function calculatePoints(
  choiceMode: ChoiceMode,
  options: OptionForScoring[],
  selectedOptionIds: string[]
): { isCorrect: boolean; pointsAwarded: number } {
  const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));
  const selected = new Set(selectedOptionIds);

  if (selected.size === 0) {
    return { isCorrect: false, pointsAwarded: 0 };
  }

  let isCorrect = false;

  if (choiceMode === ChoiceMode.SINGLE) {
    isCorrect = selected.size === 1 && correctIds.has([...selected][0]);
  } else {
    const allCorrectSelected = [...correctIds].every((id) => selected.has(id));
    const noWrongSelected = [...selected].every((id) => correctIds.has(id));
    isCorrect = allCorrectSelected && noWrongSelected && selected.size === correctIds.size;
  }

  return {
    isCorrect,
    pointsAwarded: isCorrect ? POINTS_CORRECT : 0,
  };
}
