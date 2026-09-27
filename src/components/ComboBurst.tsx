export default function ComboBurst({combo,move}:{combo:number;move:number}) {
  if(combo<3)return null;
  const title=combo>=8?"Ninja magic!":combo>=5?"Unstoppable!":"Beautiful combo!";
  return <div className={`combo-burst ${combo>=5?"combo-super":""}`} key={move} aria-hidden="true"><span>✦</span><strong>{title}</strong><b>{combo}× CHAIN</b><span>✦</span></div>;
}
