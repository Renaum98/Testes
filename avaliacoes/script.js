const streaming = document.querySelectorAll('.filme-streaming');

streaming.forEach((stream) => {
    switch (stream.textContent) {
        case "Max":
            stream.style.backgroundColor = "#0817A9";
            stream.style.color = "#ffffff"
            break;

        case "Prime":
            stream.style.backgroundColor = "#0D7CFF";
            stream.style.color = "#ffffff"
            break;

        case "Mubi":
            stream.style.backgroundColor = "black";
            stream.style.color = "#ffffff"
            break;
        
        case "Aluguel":
            stream.style.backgroundColor = "grey";
            stream.style.color = "#ffffff"
            break;

        case "Disney+":
            stream.style.backgroundColor = "#376C7B";
            stream.style.color = "#ffffff"
            break;

        case "Netflix":
            stream.style.backgroundColor = "#e6111a";
            stream.style.color = "#ffffff"
            break;

        case "Mercado":
            stream.style.backgroundColor = "#FEE708";
            stream.style.color = "#ffffff"
            break;

        default:
            break;
    }
});
