const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');

app.use((req, res, next) => {
    res.locals.ip = req.ip; 
    next();
});

let obGlobal = {
    obErori: null
};


function initErori() {
    const caleJson = path.join(__dirname, 'erori.json');
    if (fs.existsSync(caleJson)) {
        let dateRaw = fs.readFileSync(caleJson, 'utf8');
        obGlobal.obErori = JSON.parse(dateRaw);
        
        obGlobal.obErori.info_erori.forEach(eroare => {
            eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
        });
    }
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroareGasita = obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
    let eroareDefault = obGlobal.obErori.eroare_default;

    res.status(identificator || 500).render("pagini/eroare", {
        titlu: titlu || (eroareGasita ? eroareGasita.titlu : eroareDefault.titlu),
        text: text || (eroareGasita ? eroareGasita.text : eroareDefault.text),
        imagine: imagine || (eroareGasita ? eroareGasita.imagine : eroareDefault.imagine)
    });
}

console.log("Calea folderului index.js (__dirname):", __dirname);
console.log("Calea fișierului (__filename):", __filename);
console.log("Folderul curent de lucru (process.cwd()):", process.cwd());

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
vect_foldere.forEach(f => {
    let cale = path.join(__dirname, f);
    if (!fs.existsSync(cale)) fs.mkdirSync(cale);
});

app.use('/resurse', express.static(path.join(__dirname, 'resurse')));
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/ico/favicon.ico'));
});
app.get([/^\/resurse(\/.*)?$/, '/resurse'], (req, res) => {
    afisareEroare(res, 403);
});
app.get(/\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});
app.get(["/", "/index", "/home"], (req, res) => {
    res.render("pagini/index");
});

app.get(/^\/(.*)/, (req, res) => {
let numePagina = req.params[0]; 
    if (numePagina === "" || numePagina === "/") numePagina = "index";
    if (numePagina.endsWith(".html")) {
        numePagina = numePagina.slice(0, -5);
    }
    if (numePagina.endsWith(".json") || numePagina.endsWith(".js")) {
        return afisareEroare(res, 403); 
    }
    if (numePagina.includes(".")) {
        if (numePagina.endsWith(".json") || numePagina.endsWith(".js")) {
            return afisareEroare(res, 403);
        }
        return afisareEroare(res, 404);
    }
    res.render("pagini/" + numePagina, function(err, html) {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500, "Eroare Server", "A apărut o problemă la randare.");
            }
        } else {
            res.send(html);
        }
    });
});


app.listen(PORT, () => {
    console.log(`Serverul a pornit pe http://localhost:${PORT}`);
});