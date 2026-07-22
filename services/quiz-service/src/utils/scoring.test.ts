import { ChoiceMode } from '@prisma/client';
import { calculatePoints, MAX_SPEED_BONUS, POINTS_CORRECT } from './scoring';

const options = [
  { id: 'a', isCorrect: true },
  { id: 'b', isCorrect: false },
  { id: 'c', isCorrect: true },
  { id: 'd', isCorrect: false },
];

describe('calculatePoints', () => {
  it('awards base points for a correct single answer with no time left', () => {
    const single = [options[0], options[1]];
    const result = calculatePoints(ChoiceMode.SINGLE, single, ['a'], 0);
    expect(result).toEqual({ isCorrect: true, pointsAwarded: POINTS_CORRECT });
  });

  it('awards full speed bonus for an instant answer', () => {
    const single = [options[0], options[1]];
    const result = calculatePoints(ChoiceMode.SINGLE, single, ['a'], 1);
    expect(result.pointsAwarded).toBe(POINTS_CORRECT + MAX_SPEED_BONUS);
  });

  it('awards proportional bonus for a mid-window answer', () => {
    const single = [options[0], options[1]];
    const result = calculatePoints(ChoiceMode.SINGLE, single, ['a'], 0.5);
    expect(result.pointsAwarded).toBe(POINTS_CORRECT + Math.round(MAX_SPEED_BONUS * 0.5));
  });

  it('clamps remainingFraction outside [0, 1]', () => {
    const single = [options[0], options[1]];
    expect(calculatePoints(ChoiceMode.SINGLE, single, ['a'], 5).pointsAwarded).toBe(
      POINTS_CORRECT + MAX_SPEED_BONUS
    );
    expect(calculatePoints(ChoiceMode.SINGLE, single, ['a'], -1).pointsAwarded).toBe(POINTS_CORRECT);
  });

  it('gives zero for a wrong single answer', () => {
    const single = [options[0], options[1]];
    expect(calculatePoints(ChoiceMode.SINGLE, single, ['b'], 1)).toEqual({
      isCorrect: false,
      pointsAwarded: 0,
    });
  });

  it('gives zero for an empty selection', () => {
    expect(calculatePoints(ChoiceMode.SINGLE, options, [], 1).pointsAwarded).toBe(0);
  });

  it('requires exact match for multiple choice', () => {
    expect(calculatePoints(ChoiceMode.MULTIPLE, options, ['a', 'c'], 0).isCorrect).toBe(true);
    expect(calculatePoints(ChoiceMode.MULTIPLE, options, ['a'], 0).isCorrect).toBe(false);
    expect(calculatePoints(ChoiceMode.MULTIPLE, options, ['a', 'c', 'b'], 0).isCorrect).toBe(false);
  });

  it('rejects multi-select on a single choice question', () => {
    const single = [options[0], options[1]];
    expect(calculatePoints(ChoiceMode.SINGLE, single, ['a', 'b'], 1).isCorrect).toBe(false);
  });
});
