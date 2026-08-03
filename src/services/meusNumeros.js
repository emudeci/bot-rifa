const { EmbedBuilder, MessageFlags } = require("discord.js");
const db = require("../database/database");

module.exports = (interaction) => {

    const rifaId = interaction.options.getInteger("rifa");

    db.all(
        `
        SELECT numero,status
        FROM numeros
        WHERE rifa_id=?
        AND usuario_id=?
        ORDER BY numero
        `,
        [
            rifaId,
            interaction.user.id
        ],
        (err, rows) => {

            if (err) {

                console.error(err);

                return interaction.reply({
                    content: "Erro ao consultar seus números.",
                    flags: MessageFlags.Ephemeral
                });

            }

            if (!rows.length) {

                return interaction.reply({
                    content: "Você não possui números nesta rifa.",
                    flags: MessageFlags.Ephemeral
                });

            }

            const lista = rows.map((r) => {

                const emoji =
                    r.status === "pago"
                        ? "🟢"
                        : "🟡";

                return `${emoji} ${String(r.numero).padStart(3, "0")}`;

            }).join("\n");

            interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blue")
                        .setTitle(`🎟 Seus números - Rifa #${rifaId}`)
                        .setDescription(lista)
                ],
                flags: MessageFlags.Ephemeral
            });

        }

    );

};