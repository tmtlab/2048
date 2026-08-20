export default function Tile({ index, value, isObstacle, isBomb, shielded, interactive, onClick }) {
  const col = (index % 4) + 1;
  const row = Math.floor(index / 4) + 1;
  const style = { gridColumn: col, gridRow: row };

  let className = 'tile';
  let content = value;

  if (isObstacle) {
    className += ' obstacle';
    content = '🚫';
  } else if (isBomb) {
    className += ' bomb';
    content = '💣';
  } else {
    className += ` tile-${value}`;
    if (shielded) className += ' shielded';
  }
  if (interactive) className += ' interactive';

  return (
    <div className={className} style={style} onClick={interactive ? () => onClick(index) : undefined}>
      {content}
    </div>
  );
}
