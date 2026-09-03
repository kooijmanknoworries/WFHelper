export function sha256Ascii(input: string) {
  const maxWord = 2 ** 32;
  const words: number[] = [];
  const hash: number[] = [];
  const constants: number[] = [];
  const composites: Record<number, boolean> = {};
  let primeCount = 0;

  for (let candidate = 2; primeCount < 64; candidate += 1) {
    if (composites[candidate]) continue;
    for (let multiple = candidate * candidate; multiple < 313; multiple += candidate) {
      composites[multiple] = true;
    }
    if (primeCount < 8) hash[primeCount] = (Math.sqrt(candidate) * maxWord) | 0;
    constants[primeCount] = (Math.cbrt(candidate) * maxWord) | 0;
    primeCount += 1;
  }

  const bitLength = input.length * 8;
  const padded = `${input}\x80${'\x00'.repeat((55 - input.length) & 63)}`;
  for (let index = 0; index < padded.length; index += 1) {
    words[index >> 2] |= padded.charCodeAt(index) << ((3 - (index % 4)) * 8);
  }
  words.push(Math.floor(bitLength / maxWord), bitLength);

  for (let offset = 0; offset < words.length; offset += 16) {
    const schedule = words.slice(offset, offset + 16);
    let working = hash.slice();
    for (let round = 0; round < 64; round += 1) {
      const a = working[0];
      const e = working[4];
      const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      if (round >= 16) {
        const w15 = schedule[round - 15];
        const w2 = schedule[round - 2];
        schedule[round] =
          (schedule[round - 16] +
            (((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3)) +
            schedule[round - 7] +
            (((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10))) |
          0;
      }
      const temp1 =
        (working[7] +
          sigma1 +
          ((e & working[5]) ^ (~e & working[6])) +
          constants[round] +
          schedule[round]) |
        0;
      const temp2 = (sigma0 + ((a & working[1]) ^ (a & working[2]) ^ (working[1] & working[2]))) | 0;
      working = [(temp1 + temp2) | 0, ...working.slice(0, 7)];
      working[4] = (working[4] + temp1) | 0;
    }
    hash.splice(0, 8, ...hash.map((value, index) => (value + working[index]) | 0));
  }

  return hash
    .map((value) =>
      [24, 16, 8, 0]
        .map((shift) => ((value >>> shift) & 255).toString(16).padStart(2, '0'))
        .join(''),
    )
    .join('');
}