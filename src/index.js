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
