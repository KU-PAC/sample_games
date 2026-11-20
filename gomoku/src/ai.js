export const SIZE = 15;
export const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const inside = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
export function winningLine(board, index) {
  const stone = board[index];
  if (!stone) return null;
  const x = index % SIZE, y = Math.floor(index / SIZE);
  for (const [dx, dy] of DIRECTIONS) {
    const line = [index];
    for (const sign of [-1, 1]) {
      let a = x + dx * sign, b = y + dy * sign;
      while (inside(a, b) && board[b * SIZE + a] === stone) {
        line.push(b * SIZE + a); a += dx * sign; b += dy * sign;
      }
    }
    if (line.length >= 5) return line.sort((a, b) => a - b);
  }
  return null;
}
// Evaluate contiguous lines and every five-cell window containing the move.
export function pointScore(board, index, player) {
  if (board[index]) return -Infinity;
  const x = index % SIZE, y = Math.floor(index / SIZE);
  let score = 0;
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1, open = 0;
    for (const sign of [-1, 1]) {
      let a = x + dx * sign, b = y + dy * sign;
      while (inside(a, b) && board[b * SIZE + a] === player) { count++; a += dx * sign; b += dy * sign; }
      if (inside(a, b) && board[b * SIZE + a] === 0) open++;
    }
    if (count >= 5) return 10_000_000;
    score += count === 4 ? (open === 2 ? 180_000 : open ? 28_000 : 0)
      : count === 3 ? (open === 2 ? 9_000 : open ? 700 : 0)
      : count === 2 ? (open === 2 ? 450 : open ? 90 : 0) : open * 5;
    for (let start = -4; start <= 0; start++) {
      let stones = 0, valid = true;
      for (let k = start; k < start + 5; k++) {
        const a = x + dx * k, b = y + dy * k;
        if (!inside(a, b) || (board[b * SIZE + a] && board[b * SIZE + a] !== player)) { valid = false; break; }
        if (k === 0 || board[b * SIZE + a] === player) stones++;
      }
      if (valid) score += [0, 1, 12, 150, 1800, 0][stones];
    }
  }
  return score;
}
export function candidates(board, player = 2, limit = 12) {
  const nearby = new Set();
  board.forEach((stone, i) => {
    if (!stone) return;
    const x = i % SIZE, y = Math.floor(i / SIZE);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (inside(x + dx, y + dy) && !board[(y + dy) * SIZE + x + dx]) nearby.add((y + dy) * SIZE + x + dx);
    }
  });
  if (!nearby.size) return board.every(v => !v) ? [{ index: 112, score: 0, attack: 0, defend: 0 }] : [];
  return [...nearby].map(index => {
    const attack = pointScore(board, index, player), defend = pointScore(board, index, 3 - player);
    const center = 14 - Math.abs(index % SIZE - 7) - Math.abs(Math.floor(index / SIZE) - 7);
    return { index, attack, defend, score: attack >= 10_000_000 ? 1e9 : defend >= 10_000_000 ? 1e8 + attack : attack + defend * 1.1 + center };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}
export function chooseMove(input, difficulty = 'normal', options = {}) {
  const board = [...input], start = performance.now(), budget = options.budget ?? 900;
  const deadline = start + budget;
  const root = candidates(board, 2, 10);
  let nodes = 0, prunes = 0, completedDepth = 0;
  const result = (move, ranked = root) => ({ index: move?.index ?? -1, candidates: ranked.slice(0, 5), nodes, prunes, depth: completedDepth, elapsed: Math.round(performance.now() - start) });
  if (!root.length) return result(null);
  if (root[0].attack >= 1e7 || root[0].defend >= 1e7) return result(root[0]);
  if (difficulty === 'easy') {
    const empty = board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
    const index = empty[Math.floor((options.random ?? Math.random)() * empty.length)];
    return result({ index }, [{ index, score: 0 }]);
  }
  if (difficulty !== 'hard') return result(root[0]);
  const timeout = Symbol('timeout');
  function evaluate() {
    const own = candidates(board, 2, 3), other = candidates(board, 1, 3);
    return own.reduce((n, c, i) => n + c.attack / (i + 1), 0) - other.reduce((n, c, i) => n + c.attack / (i + 1), 0) * 1.15;
  }
  function search(depth, alpha, beta, player, last) {
    nodes++;
    if (performance.now() >= deadline) throw timeout;
    if (winningLine(board, last)) return board[last] === 2 ? 1e8 + depth * 1e5 : -1e8 - depth * 1e5;
    if (!depth) return evaluate();
    const moves = candidates(board, player, 7);
    if (!moves.length) return 0;
    let best = player === 2 ? -Infinity : Infinity;
    for (const c of moves) {
      board[c.index] = player;
      let value;
      try { value = search(depth - 1, alpha, beta, 3 - player, c.index); }
      finally { board[c.index] = 0; }
      if (player === 2) { best = Math.max(best, value); alpha = Math.max(alpha, best); }
      else { best = Math.min(best, value); beta = Math.min(beta, best); }
      if (beta <= alpha) { prunes++; break; }
    }
    return best;
  }
  let ranked = root;
  for (let depth = 1; depth <= 3; depth++) {
    const next = [];
    try {
      for (const c of ranked) {
        board[c.index] = 2;
        let value;
        try { value = search(depth - 1, -Infinity, Infinity, 1, c.index); }
        finally { board[c.index] = 0; }
        next.push({ ...c, score: value });
        options.onProgress?.({ ...result(c, [...next].sort((a, b) => b.score - a.score)), searchingDepth: depth });
      }
      ranked = next.sort((a, b) => b.score - a.score);
      completedDepth = depth;
    } catch (error) { if (error !== timeout) throw error; break; }
  }
  return result(ranked[0], ranked);
}
