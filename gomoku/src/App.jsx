import React, { useEffect, useMemo, useState } from 'react';
import { SIZE, winningLine } from './ai.js';
const coordinate = i => `${'ABCDEFGHIJKLMNO'[i % SIZE]}${SIZE - Math.floor(i / SIZE)}`;
const modes = { easy: ['Easy', 'ランダム + 即勝ち・防御'], normal: ['Normal', '連続形と脅威の評価'], hard: ['Hard', 'Minimax + Alpha-Beta'] };
export default function App() {
  const [moves, setMoves] = useState([]), [cursor, setCursor] = useState(0);
  const [difficulty, setDifficulty] = useState('normal'), [show, setShow] = useState(true);
  const [thinking, setThinking] = useState(false), [analysis, setAnalysis] = useState(null), [error, setError] = useState('');
  const board = useMemo(() => {
    const b = Array(225).fill(0); moves.slice(0, cursor).forEach((index, i) => { b[index] = i % 2 + 1; }); return b;
  }, [moves, cursor]);
  const line = cursor ? winningLine(board, moves[cursor - 1]) : null;
  const reviewing = cursor !== moves.length, ended = !!line || cursor === 225;
  useEffect(() => {
    if (reviewing || ended || cursor % 2 === 0) { setThinking(false); return; }
    setThinking(true); setAnalysis(null); setError('');
    const worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
    let timer;
    worker.onmessage = ({ data }) => {
      if (data.type === 'error') { setError('AIの処理に失敗しました。一手戻して再試行してください。'); setThinking(false); return; }
      setAnalysis(data);
      if (data.type === 'done') {
        timer = setTimeout(() => {
          if (data.index >= 0) { setMoves(previous => [...previous, data.index]); setCursor(previous => previous + 1); }
          setThinking(false);
        }, 280);
      }
    };
    worker.onerror = () => { setError('AIを起動できませんでした。一手戻して再試行してください。'); setThinking(false); };
    worker.postMessage({ board, difficulty });
    return () => { worker.terminate(); clearTimeout(timer); };
  }, [board, difficulty, reviewing, ended, cursor]);
  function reset(mode = difficulty) { setDifficulty(mode); setMoves([]); setCursor(0); setAnalysis(null); setError(''); }
  function play(i) {
    if (board[i] || thinking || reviewing || ended || cursor % 2) return;
    setAnalysis(null); setMoves([...moves, i]); setCursor(cursor + 1);
  }
  function undo() {
    const next = cursor % 2 ? cursor - 1 : Math.max(0, cursor - 2);
    setMoves(moves.slice(0, next)); setCursor(next); setAnalysis(null); setError('');
  }
  const status = reviewing ? '棋譜を確認中' : line ? (board[line[0]] === 1 ? 'あなたの勝利！' : 'AIの勝利') : ended ? '引き分け' : thinking ? 'AIが候補手を比較しています' : 'あなたの番です';
  return <div className="gomoku-app">
    <header className="topbar"><div className="brand"><span className="brand-mark">◈</span> SIGNAL ARCADE</div><div className="collection"><span className="active">01 / GOMOKU</span><span>STRATEGY</span></div><span className="badge">HUMAN × ALGORITHM</span></header>
    <main className="gomoku-layout">
      <section className="board-section">
        <div className="game-heading"><div><div className="eyebrow">A quiet battle of minds</div><h1>五目並べ<span>GOMOKU</span></h1></div><span className="board-tag">15 × 15</span></div>
        <div className="turn-strip" aria-live="polite"><div className={`turn-stone ${thinking ? 'white' : ''}`}/><strong>{status}</strong><span className="mono">MOVE {String(cursor).padStart(2, '0')}</span></div>
        <div className="board-frame"><div className="letters">{'ABCDEFGHIJKLMNO'.split('').map(v => <span key={v}>{v}</span>)}</div><div className="numbers">{Array.from({length:15},(_,i)=><span key={i}>{15-i}</span>)}</div>
          <div className="board" role="group" aria-label="15×15の五目並べ盤">
            <div className="grid-lines"/>
            {[48,56,112,168,176].map(i => <span key={i} className="star-point" style={{left:`${(i%15+.5)/15*100}%`,top:`${(Math.floor(i/15)+.5)/15*100}%`}}/>)}
            {board.map((stone, i) => { const rank = !reviewing && show ? analysis?.candidates.findIndex(c => c.index === i) ?? -1 : -1;
              return <button key={i} className={`intersection ${stone ? 'occupied' : ''} ${line?.includes(i) ? 'winning' : ''}`} aria-label={`${coordinate(i)} ${stone === 1 ? '黒石' : stone === 2 ? '白石' : '空点'}`} aria-disabled={!!stone || thinking || reviewing || ended || !!(cursor % 2)} onClick={() => play(i)}>
                {stone ? <span className={`stone ${stone === 1 ? 'black' : 'white'} ${i === moves[cursor-1] ? 'last' : ''}`}/> : rank >= 0 ? <span className={`candidate rank-${rank}`}>{rank+1}</span> : <span className="ghost-stone"/>}
              </button>; })}
            {line && <svg className="win-line" viewBox="0 0 15 15"><line x1={line[0]%15+.5} y1={Math.floor(line[0]/15)+.5} x2={line.at(-1)%15+.5} y2={Math.floor(line.at(-1)/15)+.5}/></svg>}
          </div>
        </div>
        <div className="board-footer"><span><i className="key-stone"/> あなた：黒（先手）</span><span><i className="key-stone light"/> AI：白（後手）</span><span>縦・横・斜めに5つ</span></div>
      </section>
      <aside className="side-panel">
        <section className="panel-block"><div className="eyebrow">Your opponent</div><h2>対戦AIを選ぶ</h2><div className="difficulty">{Object.entries(modes).map(([key,[label]]) => <button key={key} className={difficulty===key?'selected':''} onClick={()=>reset(key)}>{label}</button>)}</div><p className="mode-description">{modes[difficulty][1]}</p><p className="fineprint">難易度を変更すると新しい対局が始まります。</p></section>
        <section className="panel-block thought-panel"><div className="panel-title"><h2>思考をのぞく</h2><label className="switch"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/><span/></label></div><p className="muted">AIが比較した候補手を盤面に表示。</p>
          <div className={`thinking-status ${thinking?'running':''}`}><span/>{thinking ? `探索中 · 深さ ${analysis?.searchingDepth ?? 1}` : analysis ? '直前のAI評価' : 'あなたの着手を待っています'}</div>
          {analysis ? <><div className="candidates-list">{analysis.candidates.slice(0,3).map((c,i)=><div key={c.index}><span className="rank-label">0{i+1}</span><strong className="mono">{coordinate(c.index)}</strong><div className="evaluation-bar"><span style={{width:`${analysis.candidates[0].score===analysis.candidates.at(-1).score?100:25+75*(c.score-analysis.candidates.at(-1).score)/(analysis.candidates[0].score-analysis.candidates.at(-1).score)}%`}}/></div><span className="mono">{Math.round(c.score).toLocaleString()}</span></div>)}</div><div className="ai-stats"><div><strong>{analysis.nodes.toLocaleString()}</strong><span>探索ノード</span></div><div><strong>{analysis.prunes}</strong><span>枝刈り</span></div><div><strong>{analysis.elapsed}<small> ms</small></strong><span>思考時間</span></div></div><p className="fineprint">候補の数値は評価値です（勝率ではありません）。完了深度：{analysis.depth}</p></> : <div className="thought-empty"><span>⌘</span><p>一手の、その先へ。<br/>候補位置と評価をここに表示します。</p></div>}
          <p className="fineprint algorithm-note">対戦AIはブラウザ内で動く探索アルゴリズムです。制作支援に使用したCodexとは別物です。Hard：最大深度3・候補10手・約900ms。</p>
        </section>
        <section className="panel-block history-panel"><div className="panel-title"><h2>対局の記録</h2><span className="mono muted">{cursor} / {moves.length}</span></div><div className="history-controls"><button aria-label="最初へ" disabled={!cursor} onClick={()=>setCursor(0)}>⏮</button><button aria-label="一手前へ" disabled={!cursor} onClick={()=>setCursor(cursor-1)}>◀</button><button aria-label="一手先へ" disabled={cursor===moves.length} onClick={()=>setCursor(cursor+1)}>▶</button><button aria-label="最新へ" disabled={cursor===moves.length} onClick={()=>setCursor(moves.length)}>⏭</button></div><div className="move-list">{moves.length ? moves.map((m,i)=><button key={i} onClick={()=>setCursor(i+1)} className={cursor===i+1?'current':''}><span>{i+1}.</span><i className={`key-stone ${i%2?'light':''}`}/>{coordinate(m)}</button>) : <p className="muted">最初の一手を置いてみましょう。</p>}</div></section>
        {error && <p role="alert">{error}</p>}
        <div className="game-actions"><button disabled={!cursor} onClick={undo}>一手戻す</button><button className="primary" onClick={()=>reset()}>新しい対局</button></div>
      </aside>
    </main><footer className="page-footer"><span>SIGNAL ARCADE / THE STRATEGY COLLECTION</span><span>静かに考える。次の一手が、景色を変える。</span></footer>
  </div>;
}
