const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), "rifa.db");
const dbDir = path.dirname(dbPath);

fs.mkdirSync(dbDir, { recursive: true });

// No primeiro deploy com Volume, copia o banco existente para o armazenamento persistente.
const bancoLocal = path.resolve(process.cwd(), "rifa.db");
if (dbPath !== bancoLocal && !fs.existsSync(dbPath) && fs.existsSync(bancoLocal)) {
    fs.copyFileSync(bancoLocal, dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Erro ao conectar ao banco:", err);
        return;
    }

    console.log("✅ Banco conectado!");
});

function adicionarColuna(tabela, coluna, definicao) {
    db.run(
        `ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`,
        (err) => {
            if (!err) {
                console.log(`✅ Coluna ${tabela}.${coluna} criada`);
                return;
            }

            if (err.message.includes("duplicate column name")) {
                return;
            }

            console.error(
                `❌ Erro ao criar ${tabela}.${coluna}:`,
                err
            );
        }
    );
}

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS rifas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            premio TEXT NOT NULL,
            valor REAL NOT NULL,
            quantidade INTEGER NOT NULL,
            meta INTEGER,
            vendidos INTEGER DEFAULT 0,
            status TEXT DEFAULT 'ativa',
            criador_id TEXT,
            canal_id TEXT,
            mensagem_id TEXT,
            criada_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rifa_id INTEGER,
            usuario_id TEXT,
            valor REAL,
            status TEXT DEFAULT 'pendente',
            ticket_canal_id TEXT,
            comprovante TEXT,
            comprovante_nome TEXT,
            comprovante_url TEXT,
            comprovante_tipo TEXT,
            aprovado_em DATETIME,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (rifa_id)
            REFERENCES rifas(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS numeros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rifa_id INTEGER,
            numero INTEGER,
            usuario_id TEXT,
            pagamento_id INTEGER,
            status TEXT DEFAULT 'livre',
            reservado_em DATETIME,
            pago_em DATETIME,

            FOREIGN KEY (rifa_id)
            REFERENCES rifas(id),

            FOREIGN KEY (pagamento_id)
            REFERENCES pagamentos(id)
        )
    `);

    adicionarColuna(
        "rifas",
        "meta",
        "INTEGER"
    );

    adicionarColuna(
        "numeros",
        "pagamento_id",
        "INTEGER"
    );

    adicionarColuna(
        "pagamentos",
        "ticket_canal_id",
        "TEXT"
    );

    adicionarColuna(
        "pagamentos",
        "comprovante",
        "TEXT"
    );

    adicionarColuna(
        "pagamentos",
        "comprovante_nome",
        "TEXT"
    );

    adicionarColuna(
        "pagamentos",
        "comprovante_url",
        "TEXT"
    );

    adicionarColuna(
        "pagamentos",
        "comprovante_tipo",
        "TEXT"
    );

    adicionarColuna(
        "pagamentos",
        "aprovado_em",
        "DATETIME"
    );
});

module.exports = db;