import './card-contador.estilos.css';


export function CardContador(){
    const dataAtual = new Date();
    
    return(
        <div className="card-contador_container">
            <div className="card-contador_item">
                <p></p>
            </div>
        </div>
    )
}