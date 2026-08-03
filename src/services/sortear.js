const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

module.exports = (client, interaction) => {

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: "❌ Apenas administradores.",
            flags: MessageFlags.Ephemeral
        });
    }

    const rifaId = interaction.options.getInteger("rifa");

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

                return interaction.reply({
                    content: "❌ Erro ao buscar a rifa.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!rifa) {
                return interaction.reply({
                    content: "❌ Rifa não encontrada.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const meta = rifa.meta || rifa.quantidade;

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

                    if (err) {
                        console.error(err);

                        return interaction.reply({
                            content: "❌ Erro ao verificar a meta.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const pagos = resultado.pagos || 0;
                    const faltam = Math.max(0, meta - pagos);
                    const porcentagem = Math.min(
                        100,
                        Math.floor((pagos / meta) * 100)
                    );

                    if (pagos < meta) {
                        return interaction.reply({
                            content:
                                `❌ O sorteio ainda não foi liberado.\n` +
                                `🎯 Meta: ${meta}\n` +
                                `✅ Pagos: ${pagos}\n` +
                                `📊 Progresso: ${porcentagem}%\n` +
                                `⏳ Faltam: ${faltam} números pagos.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    db.get(
                        `
                        SELECT *
                        FROM numeros
                        WHERE
                            rifa_id=?
                            AND status='pago'
                        ORDER BY RANDOM()
                        LIMIT 1
                        `,
                        [rifaId],
                        async (err, numero) => {

                            if (err) {
                                console.error(err);

                                return interaction.reply({
                                    content: "❌ Erro ao realizar o sorteio.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            if (!numero) {
                                return interaction.reply({
                                    content: "❌ Não há números pagos para sortear.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            const usuario = await client.users
                                .fetch(numero.usuario_id)
                                .catch(() => null);

                            if (!usuario) {
                                return interaction.reply({
                                    content: "❌ Não foi possível localizar o vencedor.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            const embed = new EmbedBuilder()
                                .setColor("Gold")
                                .setTitle("🏆 Sorteio Finalizado")
                                .setDescription(`🎉 Parabéns, <@${usuario.id}>!`)
                                .addFields(
                                    {
                                        name: "🎟 Número sorteado",
                                        value: String(numero.numero).padStart(3, "0"),
                                        inline: true
                                    },
                                    {
                                        name: "👤 Vencedor",
                                        value: `<@${usuario.id}>`,
                                        inline: true
                                    },
                                    {
                                        name: "🎯 Meta alcançada",
                                        value: `${pagos}/${meta}`,
                                        inline: true
                                    }
                                )
                                .setFooter({
                                    text: `Rifa #${rifaId}`
                                })
                                .setTimestamp();

                            db.run(
                                `
                                UPDATE rifas
                                SET status='finalizada'
                                WHERE id=?
                                `,
                                [rifaId],
                                (err) => {
                                    if (err) {
                                        console.error(err);
                                    }
                                }
                            );

                            return interaction.reply({
                                embeds: [embed]
                            });
                        }
                    );
                }
            );
        }
    );
};