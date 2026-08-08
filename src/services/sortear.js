const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

module.exports = (client, interaction) => {

    if (
        !interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return interaction.reply({
            content: "❌ Apenas administradores.",
            flags: MessageFlags.Ephemeral
        });
    }

    let rifaId;

    // Comando /sortear
    if (interaction.isChatInputCommand()) {
        rifaId = interaction.options.getInteger("rifa");
    }

    // Botão do Painel Admin
    if (
        interaction.isButton() &&
        interaction.customId.startsWith("painel_sortear_")
    ) {
        rifaId = Number(
            interaction.customId.replace(
                "painel_sortear_",
                ""
            )
        );
    }

    if (!rifaId) {
        return interaction.reply({
            content: "❌ ID da rifa inválido.",
            flags: MessageFlags.Ephemeral
        });
    }

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

            if (rifa.status === "finalizada") {
                return interaction.reply({
                    content: "❌ Essa rifa já foi sorteada.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const meta =
                rifa.meta ||
                rifa.quantidade;

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

                    const pagos =
                        resultado.pagos || 0;

                    const faltam = Math.max(
                        0,
                        meta - pagos
                    );

                    const porcentagem = Math.min(
                        100,
                        Math.floor(
                            (pagos / meta) * 100
                        )
                    );

                    if (pagos < meta) {
                        return interaction.reply({
                            content:
                                `❌ O sorteio ainda não foi liberado.\n\n` +
                                `🎯 Meta: **${meta}**\n` +
                                `✅ Pagos: **${pagos}**\n` +
                                `📊 Progresso: **${porcentagem}%**\n` +
                                `⏳ Faltam: **${faltam} números pagos**.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Busca todos os números pagos em ordem aleatória
                    db.all(
                        `
                        SELECT *
                        FROM numeros
                        WHERE
                            rifa_id=?
                            AND status='pago'
                        ORDER BY RANDOM()
                        `,
                        [rifaId],
                        async (err, numeros) => {

                            if (err) {
                                console.error(err);

                                return interaction.reply({
                                    content: "❌ Erro ao realizar o sorteio.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            if (!numeros || numeros.length < 3) {
                                return interaction.reply({
                                    content:
                                        "❌ É necessário ter pelo menos 3 números pagos para sortear 3 vencedores.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            const vencedores = [];
                            const usuariosJaEscolhidos =
                                new Set();

                            for (const numero of numeros) {

                                if (
                                    usuariosJaEscolhidos.has(
                                        numero.usuario_id
                                    )
                                ) {
                                    continue;
                                }

                                vencedores.push(numero);

                                usuariosJaEscolhidos.add(
                                    numero.usuario_id
                                );

                                if (vencedores.length === 3) {
                                    break;
                                }
                            }

                            if (vencedores.length < 3) {
                                return interaction.reply({
                                    content:
                                        "❌ É necessário ter pelo menos 3 compradores diferentes com números pagos para sortear 1º, 2º e 3º lugar.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            const usuarios = [];

                            for (
                                const vencedor of vencedores
                            ) {
                                const usuario =
                                    await client.users
                                        .fetch(
                                            vencedor.usuario_id
                                        )
                                        .catch(() => null);

                                usuarios.push(usuario);
                            }

                            if (
                                usuarios.some(
                                    usuario => !usuario
                                )
                            ) {
                                return interaction.reply({
                                    content:
                                        "❌ Não foi possível localizar um dos vencedores.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            const primeiro =
                                vencedores[0];

                            const segundo =
                                vencedores[1];

                            const terceiro =
                                vencedores[2];

                            const usuarioPrimeiro =
                                usuarios[0];

                            const usuarioSegundo =
                                usuarios[1];

                            const usuarioTerceiro =
                                usuarios[2];

                            const embed =
                                new EmbedBuilder()
                                    .setColor("Gold")
                                    .setTitle(
                                        "🏆 Sorteio Finalizado"
                                    )
                                    .setDescription(
                                        `🎉 A rifa **${rifa.premio}** foi sorteada!`
                                    )
                                    .addFields(
                                        {
                                            name: "🥇 1º Lugar",
                                            value:
                                                `<@${usuarioPrimeiro.id}>\n` +
                                                `🎟 Número: **${String(
                                                    primeiro.numero
                                                ).padStart(
                                                    3,
                                                    "0"
                                                )}**`,
                                            inline: false
                                        },
                                        {
                                            name: "🥈 2º Lugar",
                                            value:
                                                `<@${usuarioSegundo.id}>\n` +
                                                `🎟 Número: **${String(
                                                    segundo.numero
                                                ).padStart(
                                                    3,
                                                    "0"
                                                )}**`,
                                            inline: false
                                        },
                                        {
                                            name: "🥉 3º Lugar",
                                            value:
                                                `<@${usuarioTerceiro.id}>\n` +
                                                `🎟 Número: **${String(
                                                    terceiro.numero
                                                ).padStart(
                                                    3,
                                                    "0"
                                                )}**`,
                                            inline: false
                                        },
                                        {
                                            name: "🎯 Meta alcançada",
                                            value:
                                                `${pagos}/${meta}`,
                                            inline: false
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
                                err => {

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
