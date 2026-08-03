const {
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");
const atualizarEmbed = require("./atualizarEmbed");

module.exports = async (client, interaction) => {

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: "❌ Apenas administradores.",
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    const rifaId = interaction.options.getInteger("rifa");
    const novaMeta = interaction.options.getInteger("meta");

    db.get(
        `
        SELECT *
        FROM rifas
        WHERE id=?
        `,
        [rifaId],
        (err, rifa) => {

            if (err) {
                console.error(err);

                return interaction.editReply({
                    content: "❌ Erro ao buscar a rifa."
                });
            }

            if (!rifa) {
                return interaction.editReply({
                    content: "❌ Rifa não encontrada."
                });
            }

            if (novaMeta < 1) {
                return interaction.editReply({
                    content: "❌ A meta deve ser maior que zero."
                });
            }

            if (novaMeta > rifa.quantidade) {
                return interaction.editReply({
                    content:
                        `❌ A meta não pode ser maior que o total da rifa.\n` +
                        `🎟 Total: ${rifa.quantidade}`
                });
            }

            db.run(
                `
                UPDATE rifas
                SET meta=?
                WHERE id=?
                `,
                [
                    novaMeta,
                    rifaId
                ],
                async (err) => {

                    if (err) {
                        console.error(err);

                        return interaction.editReply({
                            content: "❌ Erro ao atualizar a meta."
                        });
                    }

                    await atualizarEmbed(client, rifaId);

                    return interaction.editReply({
                        content:
                            `✅ Meta atualizada com sucesso.\n` +
                            `🎯 Nova meta: ${novaMeta} números pagos.`
                    });
                }
            );
        }
    );
};