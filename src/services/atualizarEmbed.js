const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../database/database");

module.exports = async (client, rifaId) => {

    db.get(
        "SELECT * FROM rifas WHERE id=?",
        [rifaId],
        async (err, rifa) => {

            if (err || !rifa) return;

            db.get(
                `
                SELECT COUNT(*) AS pagos
                FROM numeros
                WHERE
                    rifa_id=?
                    AND status='pago'
                `,
                [rifaId],
                (err, resultado) => {

                    if (err) return;

                    const pagos = resultado.pagos;
                    const meta = rifa.meta || rifa.quantidade;

                    db.get(
                        `
                        SELECT COUNT(DISTINCT usuario_id) AS compradores
                        FROM numeros
                        WHERE
                            rifa_id=?
                            AND usuario_id IS NOT NULL
                        `,
                        [rifaId],
                        async (err, compradoresResult) => {

                            if (err) return;

                            const compradores = compradoresResult.compradores;

                            const porcentagem = Math.min(
                                100,
                                Math.round((pagos / meta) * 100)
                            );

                            const faltam = Math.max(
                                0,
                                meta - pagos
                            );

                            const blocos = 10;

                            const cheios = Math.round(
                                porcentagem / 10
                            );

                            const barra =
                                "🟩".repeat(cheios) +
                                "⬜".repeat(blocos - cheios);

                            const canal = await client.channels
                                .fetch(rifa.canal_id)
                                .catch(() => null);

                            if (!canal) return;

                            const mensagem = await canal.messages
                                .fetch(rifa.mensagem_id)
                                .catch(() => null);

                            if (!mensagem) return;

                            const liberado =
                                porcentagem >= 100;

                            const embed = new EmbedBuilder()
                                .setColor(
                                    liberado
                                        ? "Green"
                                        : "Orange"
                                )
                                .setTitle("🎟 Nova Rifa")
                                .setDescription(
                                    `**${rifa.premio}**\n\n` +
                                    `${barra}\n` +
                                    `**${porcentagem}% concluído**`
                                )
                                .addFields(
                                    {
                                        name: "💰 Valor",
                                        value: `R$ ${Number(rifa.valor)
                                            .toFixed(2)
                                            .replace(".", ",")}`,
                                        inline: true
                                    },
                                    {
                                        name: "🎟 Total",
                                        value: `${rifa.quantidade}`,
                                        inline: true
                                    },
                                    {
                                        name: "🎯 Meta",
                                        value: `${meta}`,
                                        inline: true
                                    },
                                    {
                                        name: "✅ Pagos",
                                        value: `${pagos}/${meta}`,
                                        inline: true
                                    },
                                    {
                                        name: "👥 Compradores",
                                        value: `${compradores}`,
                                        inline: true
                                    },
                                    {
                                        name: "📈 Progresso",
                                        value: `${porcentagem}%`,
                                        inline: true
                                    },
                                    {
                                        name: "⏳ Falta",
                                        value: liberado
                                            ? "Nenhum número"
                                            : `${faltam} números`,
                                        inline: false
                                    },
                                    {
                                        name: "🎉 Sorteio",
                                        value: liberado
                                            ? "🟢 Liberado"
                                            : "🔴 Aguardando meta",
                                        inline: false
                                    }
                                )
                                .setFooter({
                                    text: `Rifa #${rifa.id}`
                                })
                                .setTimestamp();

                            const row =
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`comprar_${rifa.id}`)
                                        .setLabel("Comprar")
                                        .setEmoji("🎟")
                                        .setStyle(ButtonStyle.Success),

                                    new ButtonBuilder()
                                        .setCustomId(`comprovante_${rifa.id}`)
                                        .setLabel("Enviar Comprovante")
                                        .setEmoji("📄")
                                        .setStyle(ButtonStyle.Primary)
                                );

                            await mensagem.edit({
                                embeds: [embed],
                                components: [row]
                            });

                        }
                    );

                }
            );

        }
    );

};