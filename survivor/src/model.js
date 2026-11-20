export const PHASE_SECONDS = 45;
export const TOTAL_SECONDS = PHASE_SECONDS * 3;
export const WORLD_RADIUS = 29;
export const PHASES = [
  { name: '静かな目覚め', subtitle: 'THE AWAKENING', color: '#bdea9f' },
  { name: '迫りくる群れ', subtitle: 'THE SWARM', color: '#ffd18c' },
  { name: '最後の夜明け', subtitle: 'THE LAST DAWN', color: '#f6a5af' },
];
export const UPGRADES = [
  { id: 'haste', icon: 'ϟ', name: '速射の芽', detail: '自動攻撃の間隔 −18%', type: 'ATTACK SPEED' },
  { id: 'speed', icon: '»', name: '風の足音', detail: '移動速度 +15%', type: 'MOVEMENT' },
  { id: 'range', icon: '◎', name: '遠見の花', detail: '攻撃範囲 +25%', type: 'RANGE' },
  { id: 'damage', icon: '✧', name: '鋭い光', detail: '攻撃力 +35%', type: 'DAMAGE' },
  { id: 'orbit', icon: '◌', name: '星の衛星', detail: '周囲を回る攻撃衛星を1つ追加', type: 'NEW WEAPON' },
  { id: 'multishot', icon: '⋔', name: '分かれ道', detail: '同時に狙う敵を1体追加', type: 'MULTI SHOT' },
  { id: 'heal', icon: '✚', name: '生命の雫', detail: '体力を35回復・最大体力 +10', type: 'VITALITY' },
];
export const terrainHeight = (x, z) => Math.sin(x * .19) * .55 + Math.cos(z * .21) * .45 + Math.sin((x + z) * .13) * .35;
export function createRun(random = Math.random) {
  return { status: 'ready', time: 0, phase: 0, player: { x: 0, z: 0, hp: 100, maxHp: 100, invincible: 0, angle: 0 },
    stats: { speed: 7, interval: .65, range: 12, damage: 18, orbit: 0, multishot: 1 },
    enemies: [], shots: [], items: [], particles: [], kills: 0, xp: 0, nextXp: 7, level: 1, build: [], choices: [],
    shotTimer: 0, spawnTimer: .6, itemTimer: 6, id: 0, random, flash: 0, hurt: 0, dash: 0, dashCooldown: 0 };
}
export function burst(s, x, z, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = s.random() * Math.PI * 2, speed = 1 + s.random() * 4;
    s.particles.push({ id: ++s.id, x, z, y: .8, vx: Math.cos(a) * speed, vz: Math.sin(a) * speed, vy: 3 + s.random() * 3, life: .7, color });
  }
  if (s.particles.length > 240) s.particles.splice(0, s.particles.length - 240);
}
function rollChoices(s) {
  const pool = [...UPGRADES];
  s.choices = [];
  for (let i = 0; i < 3; i++) s.choices.push(pool.splice(Math.floor(s.random() * pool.length), 1)[0]);
  s.status = 'upgrade';
}
export function chooseUpgrade(s, id) {
  if (s.status !== 'upgrade' || !s.choices.some(c => c.id === id)) return false;
  const st = s.stats;
  if (id === 'haste') st.interval = Math.max(.13, st.interval * .82);
  if (id === 'speed') st.speed = Math.min(13, st.speed * 1.15);
  if (id === 'range') st.range *= 1.25;
  if (id === 'damage') st.damage *= 1.35;
  if (id === 'orbit') st.orbit++;
  if (id === 'multishot') st.multishot++;
  if (id === 'heal') { s.player.maxHp += 10; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 35); }
  s.build.push(id); s.choices = []; s.status = 'playing'; s.flash = .5;
  return true;
}
export function spawnEnemy(s) {
  const angle = s.random() * Math.PI * 2;
  const r = s.random(), type = s.phase === 0 ? 'crawler' : s.phase === 1 ? (r < .4 ? 'runner' : 'crawler') : r < .22 ? 'brute' : r < .6 ? 'runner' : 'crawler';
  const spec = type === 'brute' ? { hp: 125, speed: 2.15, radius: .95, damage: 20 } : type === 'runner' ? { hp: 25, speed: 4.15, radius: .45, damage: 9 } : { hp: 34 + s.phase * 8, speed: 2.2 + s.phase * .3, radius: .6, damage: 12 };
  let x = s.player.x + Math.cos(angle) * 21, z = s.player.z + Math.sin(angle) * 21;
  const length = Math.hypot(x, z);
  if (length > WORLD_RADIUS + 2) { x *= (WORLD_RADIUS + 2) / length; z *= (WORLD_RADIUS + 2) / length; }
  s.enemies.push({ id: ++s.id, x, z, type, ...spec, maxHp: spec.hp, hit: 0, orbitHit: 0 });
}
function damagePlayer(s, amount) {
  if (s.player.invincible > 0) return;
  s.player.hp = Math.max(0, s.player.hp - amount); s.player.invincible = .85; s.hurt = .3;
  burst(s, s.player.x, s.player.z, '#ffd5be', 12);
  if (s.player.hp <= 0) s.status = 'lost';
}
export function tick(s, dt, input = {}) {
  if (s.status !== 'playing') return;
  dt = Math.min(dt, .05); s.time = Math.min(TOTAL_SECONDS, s.time + dt);
  s.phase = Math.min(2, Math.floor(s.time / PHASE_SECONDS));
  if (s.time >= TOTAL_SECONDS) { s.status = 'won'; return; }
  const p = s.player;
  p.invincible = Math.max(0, p.invincible - dt); s.hurt = Math.max(0, s.hurt - dt); s.flash = Math.max(0, s.flash - dt);
  s.dashCooldown = Math.max(0, s.dashCooldown - dt); s.dash = Math.max(0, s.dash - dt);
  if (input.dash && !s.dashCooldown) { s.dash = .2; s.dashCooldown = 3.5; p.invincible = .35; }
  let dx = input.x || 0, dz = input.z || 0, length = Math.hypot(dx, dz);
  if (length) { dx /= Math.max(1,length); dz /= Math.max(1,length); p.x += dx * s.stats.speed * (s.dash ? 2.8 : 1) * dt; p.z += dz * s.stats.speed * (s.dash ? 2.8 : 1) * dt; p.angle = Math.atan2(dx, dz); }
  const distance = Math.hypot(p.x, p.z);
  if (distance > WORLD_RADIUS) { p.x *= WORLD_RADIUS / distance; p.z *= WORLD_RADIUS / distance; }
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0) {
    s.spawnTimer = [.9, .52, .29][s.phase];
    if (s.enemies.length < 95) { spawnEnemy(s); if (s.phase === 2) spawnEnemy(s); }
  }
  s.itemTimer -= dt;
  if (s.itemTimer <= 0) {
    s.itemTimer = 11;
    const angle = s.random() * Math.PI * 2, r = 5 + s.random() * 5;
    let x = p.x + Math.cos(angle) * r, z = p.z + Math.sin(angle) * r;
    const dist = Math.hypot(x, z); if (dist > 27) { x *= 27 / dist; z *= 27 / dist; }
    s.items.push({ id: ++s.id, x, z, kind: 'upgrade', life: 30 });
  }
  s.shotTimer -= dt;
  if (s.shotTimer <= 0) {
    const targets = s.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < s.stats.range).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0, s.stats.multishot);
    if (targets.length) {
      s.shotTimer = s.stats.interval;
      for (const e of targets) {
        const angle = Math.atan2(e.z - p.z, e.x - p.x);
        s.shots.push({ id: ++s.id, x: p.x, z: p.z, vx: Math.cos(angle) * 25, vz: Math.sin(angle) * 25, life: s.stats.range / 25 + .1, damage: s.stats.damage });
      }
    }
  }
  for (const shot of s.shots) {
    shot.x += shot.vx * dt; shot.z += shot.vz * dt; shot.life -= dt;
    for (const e of s.enemies) if (e.hp > 0 && Math.hypot(e.x - shot.x, e.z - shot.z) < e.radius + .3) { e.hp -= shot.damage; e.hit = .12; shot.life = 0; burst(s, e.x, e.z, '#d7fbaa', 3); break; }
  }
  s.shots = s.shots.filter(b => b.life > 0);
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const ax = p.x - e.x, az = p.z - e.z, d = Math.hypot(ax, az) || 1;
    e.x += ax / d * e.speed * dt; e.z += az / d * e.speed * dt;
    e.hit = Math.max(0, e.hit - dt); e.orbitHit = Math.max(0, e.orbitHit - dt);
    if (d < e.radius + .5) damagePlayer(s, e.damage);
    for (let i = 0; i < s.stats.orbit; i++) {
      const a = s.time * 2.6 + i * Math.PI * 2 / s.stats.orbit;
      if (!e.orbitHit && Math.hypot(e.x - (p.x + Math.cos(a) * 3), e.z - (p.z + Math.sin(a) * 3)) < e.radius + .55) { e.hp -= s.stats.damage * 1.8; e.orbitHit = .35; e.hit = .15; }
    }
  }
  for (const e of s.enemies.filter(e => e.hp <= 0)) {
    s.kills++; burst(s, e.x, e.z, e.type === 'brute' ? '#ffd18c' : '#dbaaee');
    s.items.push({ id: ++s.id, x: e.x, z: e.z, kind: 'xp', value: e.type === 'brute' ? 5 : 1, life: 45 });
    if (s.random() < .06) s.items.push({ id: ++s.id, x: e.x+.5, z: e.z, kind: 'health', life: 20 });
  }
  s.enemies = s.enemies.filter(e => e.hp > 0);
  for (const item of s.items) {
    item.life -= dt;
    const ax = p.x - item.x, az = p.z - item.z, d = Math.hypot(ax, az);
    if (item.kind === 'xp' && d < 6 && d > .1) { item.x += ax / d * 10 * dt; item.z += az / d * 10 * dt; }
    if (d < 1.25) {
      item.life = 0;
      if (item.kind === 'xp') s.xp += item.value;
      if (item.kind === 'health') p.hp = Math.min(p.maxHp, p.hp + 20);
      if (item.kind === 'upgrade' && s.status === 'playing') rollChoices(s);
    }
  }
  s.items = s.items.filter(i => i.life > 0);
  if (s.xp >= s.nextXp && s.status === 'playing') { s.xp -= s.nextXp; s.nextXp = Math.round(s.nextXp * 1.4); s.level++; rollChoices(s); }
  for (const pt of s.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.z += pt.vz * dt; pt.y += pt.vy * dt; pt.vy -= 14 * dt; }
  s.particles = s.particles.filter(pt => pt.life > 0);
}
export function snapshot(s) {
  return { status: s.status, time: s.time, phase: s.phase, hp: s.player.hp, maxHp: s.player.maxHp, xp: s.xp, nextXp: s.nextXp, level: s.level, kills: s.kills, choices: s.choices, build: [...s.build], stats: {...s.stats}, dashCooldown: s.dashCooldown, hurt: s.hurt };
}
