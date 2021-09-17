export {};

declare global {
  interface Math {
    avg(numbers: number[]): number;
    median(numbers: number[]): number;
  }
}

Math.avg = function (numbers: number[]): number {
  let total = 0;
  numbers.forEach((number) => (total += number));
  return Math.floor(total / numbers.length);
};

Math.median = function (numbers: number[]): number {
  if (numbers.length === 1) return numbers[0];
  if (numbers.length % 2 === 0)
    return (
      (numbers[Math.floor(numbers.length / 2)] +
        numbers[Math.ceil(numbers.length / 2)]) /
      2
    );
  else return numbers[(numbers.length + 1) / 2];
};
