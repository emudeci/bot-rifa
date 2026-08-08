const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");

module.exports = async (client, interaction) => {

    const partes = interaction.customId.split("_");

    const rifaId = Number(partes[1]);
    let pagina = Number(partes[2]) || 1;

    const porPagina = 100;

    db.get(
        `
        SELECT *
        FROM rifas
        WHERE id=?
        `,
        [rifaId],
        (err, rifa) => {

            if (err || !rifa) {
                return interaction.reply({
                    content: "❌ Rifa não encontrada.",
                    flags: MessageFlags.Ephemeral
                });
            }

            db.all(
                `
                SELECT numero
                FROM numeros
                WHERE
                    rifa_id=?
                    AND status='livre'
                ORDER BY numero ASC
                `,
                [rifaId],
                async (err, numeros) => {

                    if (err) {
                        console.error(err);

                        return interaction.reply({
                            content: "❌ Erro ao carregar os números.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (!numeros.length) {
                        return interaction.reply({
                            content: "❌ Não existem números disponíveis.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const totalPaginas = Math.max(
                        1,
                        Math.ceil(
                            rifa.quantidade / porPagina
                        )
                    );

                    if (pagina < 1) {
                        pagina = 1;
                    }

                    if (pagina > totalPaginas) {
                        pagina = totalPaginas;
                    }

                    const inicio =
                        (pagina - 1) * porPagina + 1;

                    const fim =
                        Math.min(
                            pagina * porPagina,
                            rifa.quantidade
                        );

                    const numerosPagina =
                        numeros.filter(
                            item =>
                                item.numero >= inicio &&
                                item.numero <= fim
                        );

                    const tamanho =
                        String(rifa.quantidade).length;

                    const lista = numerosPagina.length
                        ? numerosPagina
                            .map(item =>
                                `\`${String(item.numero)
                                    .padStart(tamanho, "0")}\``
                            )
                            .join(" ")
                        : "Nenhum número livre nesta página.";

                    const embed =
                        new EmbedBuilder()
                            .setColor("Blue")
                            .setTitle(
                                "🔎 Números disponíveis"
                            )
                            .setDescription(
                                `🎁 **${rifa.premio}**\n\n` +
                                `🎟 Intervalo: **${inicio} até ${fim}**\n\n` +
                                `${lista}`
                            )
                            .addFields(
                                {
                                    name: "✅ Disponíveis",
                                    value: `${numeros.length}`,
                                    inline: true
                                },
                                {
                                    name: "📄 Página",
                                    value: `${pagina}/${totalPaginas}`,
                                    inline: true
                                }
                            )
                            .setFooter({
                                text:
                                    "Clique em Comprar e digite os números desejados."
                            });

                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        `disponiveis_${rifaId}_${pagina - 1}`
                                    )
                                    .setLabel("Anterior")
                                    .setEmoji("⬅️")
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    )
                                    .setDisabled(
                                        pagina <= 1
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        `comprar_${rifaId}`
                                    )
                                    .setLabel("Comprar")
                                    .setEmoji("🎟")
                                    .setStyle(
                                        ButtonStyle.Success
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        `disponiveis_${rifaId}_${pagina + 1}`
                                    )
                                    .setLabel("Próxima")
                                    .setEmoji("➡️")
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    )
                                    .setDisabled(
                                        pagina >= totalPaginas
                                    )
                            );

                    if (interaction.message.flags.has(
                        MessageFlags.Ephemeral
                    )) {
                        return interaction.update({
                            embeds: [embed],
                            components: [row]
                        });
                    }

                    return interaction.reply({
                        embeds: [embed],
                        components: [row],
                        flags: MessageFlags.Ephemeral
                    });
                }
            );
        }
    );
};
