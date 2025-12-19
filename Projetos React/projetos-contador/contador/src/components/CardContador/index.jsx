import "./card-contador.estilos.css";

export function CardContador() {
  const dataAtual = new Date();
  const viagem = new Date(2026, 3, 7);
  dataAtual.setHours(0, 0, 0, 0);
  viagem.setHours(0, 0, 0, 0);
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasFaltando = Math.ceil((viagem - dataAtual) / msPorDia);
  return (
    <div className="card-contador_container">
      <div className="card-contador_item">
        <p>
          Faltam <br /> <span className="contador_texto">{diasFaltando}</span> <br />
          dias para a viagem de <br />
          San Andrés
        </p>
      </div>
    </div>
  );
}
