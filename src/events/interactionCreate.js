const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");

const criarRifa = require("../services/criarRifa");
const comprarRifa = require("../services/comprarRifa");
const meusNumeros = require("../services/meusNumeros");
const confirmarPagamento = require("../services/confirmarPagamento");
const sortear = require("../services/sortear");
const configurarPix = require("../services/configurarPix");
const aprovarPagamento = require("../services/aprovarPagamento");
const recusarPagamento = require("../services/recusarPagamento");
const cancelarReserva = require("../services/cancelarReserva");
const configurarMeta = require("../services/configurarMeta");
const painelAdmin = require("../services/painelAdmin");

module.exports = async (client, interaction) => {

    if (interaction.isButton()) {

        if (interaction.customId.startsWith("aprovar_")) {
            return aprovarPagamento(client, interaction);
        }

        if (interaction.customId.startsWith("recusar_")) {
            return recusarPagamento(client, interaction);
        }

        if (interaction.customId.startsWith("cancelar_")) {
            return cancelarReserva(client, interaction);
        }

        if (interaction.customId.startsWith("painel_atualizar_")) {
            return painelAdmin(client, interaction);
        }

        if (interaction.customId.startsWith("painel_sortear_")) {
            return painelAdmin(client, interaction);
        }

        if (interaction.customId.startsWith("comprovante_")) {
            return interaction.reply({
                content: `📎 Envie uma imagem ou PDF do comprovante no canal <#${process.env.CANAL_COMPROVANTES}>.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.customId.startsWith("comprar_")) {

            const rifaId = interaction.customId.split("_")[1];

            const modal = new ModalBuilder()
                .setCustomId(`modal_comprar_${rifaId}`)
                .setTitle("Comprar números");

            const quantidade = new TextInputBuilder()
                .setCustomId("quantidade")
                .setLabel("Quantidade")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(quantidade)
            );

            return interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {

        if (interaction.customId.startsWith("modal_comprar_")) {
            return comprarRifa(client, interaction);
        }
    }

    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {

        case "configurar-pix":
            return configurarPix(interaction);

        case "ping":
            return interaction.reply("🏓 Pong!");

        case "criar-rifa":
            return criarRifa(client, interaction);

        case "configurar-meta":
            return configurarMeta(client, interaction);

        case "meus-numeros":
            return meusNumeros(interaction);

        case "confirmar-pagamento":
            return confirmarPagamento(client, interaction);

        case "sortear":
            return sortear(client, interaction);

        case "painel-admin":
            return painelAdmin(client, interaction);
    }
};
