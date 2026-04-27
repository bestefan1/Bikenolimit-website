const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass');
const sharp = require('sharp');
const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');

app.use((req, res, next) => {
    res.locals.ip = req.ip; 
    next();
});

let obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, 'resurse/scss'),
    folderCss: path.join(__dirname, 'resurse/css'),
    folderBackup: path.join(__dirname, 'backup')
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
function compileazaScss(caleScss, caleCss) {
    let drumScss = path.isAbsolute(caleScss) ? caleScss : path.join(obGlobal.folderScss, caleScss);
    let numeCssImplicit = path.basename(caleScss, '.scss') + '.css';
    let drumCss = path.isAbsolute(caleCss || "") ? caleCss : path.join(obGlobal.folderCss, caleCss || numeCssImplicit);

    
    if (fs.existsSync(drumCss)) {
        let numeFisierCss = path.basename(drumCss);
        let caleBackupCss = path.join(obGlobal.folderBackup, 'resurse/css');
        if (!fs.existsSync(caleBackupCss)) {
            fs.mkdirSync(caleBackupCss, { recursive: true });
        }
        let timestamp = new Date().getTime();
        let numeBackup = `${timestamp}_${numeFisierCss}`;
        try {
            fs.copyFileSync(drumCss, path.join(caleBackupCss, numeBackup));
        } catch (err) {
            console.error("Eroare la backup:", err);
        }
    }

    try {
        const rez = sass.compile(drumScss);
        fs.writeFileSync(drumCss, rez.css);
        console.log(`[SCSS] Compilat: ${path.basename(drumScss)} -> ${path.basename(drumCss)}`);
    } catch (err) {
        console.error("Eroare critică la compilarea SCSS:", err);
    }
}
function pregatesteImaginiGalerie() {
    const caleJson = path.join(__dirname, 'resurse/json/galerie.json');
    if (!fs.existsSync(caleJson)) return []; 

    const dateGalerie = JSON.parse(fs.readFileSync(caleJson, 'utf8'));
    const zileSaptamana = ["duminica", "luni", "marti", "miercuri", "joi", "vineri", "sambata"];

    let acum = new Date();
    let numeAzi = zileSaptamana[acum.getDay()]; 

    
    let v_imagini = dateGalerie.imagini.filter(img => {
        return img.intervale_zile.some(interval => {
            let indexStart = zileSaptamana.indexOf(interval[0].toLowerCase());
            let indexSfarsit = zileSaptamana.indexOf(interval[1].toLowerCase());
            let indexAzi = zileSaptamana.indexOf(numeAzi);
            return indexAzi >= indexStart && indexAzi <= indexSfarsit;
        });
    });

    
    if (v_imagini.length > 0) {
        let deRepetat = [...v_imagini];
        while (v_imagini.length < 6) {
            v_imagini = v_imagini.concat(deRepetat);
        }
    }

    
    if (v_imagini.length % 2 !== 0) {
        v_imagini.pop();
    }

    const folderImagini = path.join(__dirname, 'resurse/imagini');
    
    v_imagini.forEach(img => {
        let caleAbsolutaOrig = path.join(folderImagini, img.fisier_imagine);
        let numeFaraExt = path.parse(img.fisier_imagine).name;
        let caleAbsMediu = path.join(folderImagini, 'mediu', numeFaraExt + ".webp");
        let caleAbsMic = path.join(folderImagini, 'mic', numeFaraExt + ".webp");

        if (!fs.existsSync(caleAbsMediu)) {
            sharp(caleAbsolutaOrig).resize(400).toFormat("webp").toFile(caleAbsMediu);
        }
        if (!fs.existsSync(caleAbsMic)) {
            sharp(caleAbsolutaOrig).resize(200).toFormat("webp").toFile(caleAbsMic);
        }

        img.cale_mare = path.join(dateGalerie.cale_galerie, img.fisier_imagine);
        img.cale_mediu = path.join(dateGalerie.cale_galerie, 'mediu', numeFaraExt + ".webp");
        img.cale_mic = path.join(dateGalerie.cale_galerie, 'mic', numeFaraExt + ".webp");
    });

    return v_imagini;
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
    const v_imagini = pregatesteImaginiGalerie();
    res.render("pagini/index",{imagini: v_imagini});
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
    const v_imagini = pregatesteImaginiGalerie();
    res.render("pagini/" + numePagina,{imagini: v_imagini}, function(err, html) {
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

if (fs.existsSync(obGlobal.folderScss)) {
    fs.readdirSync(obGlobal.folderScss).forEach(fisier => {
        if (fisier.endsWith('.scss')) {
            compileazaScss(fisier);
        }
    });
}


fs.watch(obGlobal.folderScss, (eventType, fisier) => {
    if (fisier && fisier.endsWith('.scss')) {
        console.log(`[Watch] Fișierul ${fisier} a fost modificat. Recompilăm...`);
        compileazaScss(fisier);
    }
});

app.listen(PORT, () => {
    console.log(`Serverul a pornit pe http://localhost:${PORT}`);
});