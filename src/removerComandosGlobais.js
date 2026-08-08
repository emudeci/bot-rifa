require("dotenv").config();

const { REST, Routes } = require("discord.js");

const rest = new REST({
    version: "10"
}).setToken(process.env.TOKEN);

async function limpar() {
    try {
        console.log("🧹 Removendo comandos globais antigos...");

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            {
                body: []
            }
        );

        console.log("✅ Comandos globais removidos.");
        console.log("✅ O /criar-rifa do servidor continuará funcionando.");
    } catch (error) {
        console.error(error);
    }
}

limpar();
