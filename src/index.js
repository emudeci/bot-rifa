require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Events
} = require("discord.js");

const registrarComandos = require("./commands");
const interactionCreate = require("./events/interactionCreate");
const messageCreate = require("./events/messageCreate");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, async () => {

    console.log(`✅ ${client.user.tag} online`);

    // REMOVE COMANDOS GLOBAIS ANTIGOS
    const rest = new REST({
        version: "10"
    }).setToken(process.env.TOKEN);

    await rest.put(
        Routes.applicationCommands(
            process.env.CLIENT_ID
        ),
        {
            body: []
        }
    );

    console.log("🧹 Comandos globais antigos removidos");

    // REGISTRA OS COMANDOS ATUAIS DO SERVIDOR
    await registrarComandos();

    console.log("✅ Slash Commands registrados");
});

client.on(
    Events.InteractionCreate,
    (interaction) => interactionCreate(client, interaction)
);

client.on(
    Events.MessageCreate,
    (message) => messageCreate(client, message)
);

client.login(process.env.TOKEN);
