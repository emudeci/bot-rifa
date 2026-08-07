const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

module.exports = async (client, interaction) => {

    // 🔒 Apenas administradores
    if (
        !interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return interaction.reply({
            content: "❌ Apenas administradores podem acessar este painel.",
            flags: MessageFlags.Ephemeral
        });
    }

    let rifaId;

    // /painel-admin
    if (interaction.isChatInputCommand()) {
        rifaId = interaction.options.getInteger("rifa");
    }

    // Botão atualizar
    if (
        interaction.isButton() &&
        interaction.customId.startsWith("painel_atualizar_")
    ) {
        rifaId = Number(
            interaction.customId.replace("painel_atualizar_", "")
        );
    }

    // Botão sortear
   if (
    interaction.isButton() &&
    interaction.customId.startsWith("painel_sortear_")
) {
    return;
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

            db.get(
                `
                SELECT
                    COUNT(CASE WHEN status='pago' THEN 1 END) AS pagos,
                    COUNT(CASE WHEN status='reservado' THEN 1 END) AS reservados,
                    COUNT(CASE WHEN status='livre' THEN 1 END) AS livres,
                    COUNT(
                        DISTINCT CASE
                            WHEN usuario_id IS NOT NULL
                            THEN usuario_id
                        END
                    ) AS compradores
                FROM numeros
                WHERE rifa_id=?
                `,
                [rifaId],
                async (err, dados) => {

                    if (err) {
                        console.error(err);

                        return interaction.reply({
                            content: "❌ Erro ao carregar as estatísticas.",
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const pagos = dados.pagos || 0;
                    const reservados = dados.reservados || 0;
                    const livres = dados.livres || 0;
                    const compradores = dados.compradores || 0;

                    const meta =
                        rifa.meta ||
                        rifa.quantidade;

                    const porcentagem = Math.min(
                        100,
                        Math.round(
                            (pagos / meta) * 100
                        )
                    );

                    const faltam = Math.max(
                        0,
                        meta - pagos
                    );

                    const arrecadado =
                        pagos * Number(rifa.valor);

                    const valorMeta =
                        meta * Number(rifa.valor);

                    const faltaValor = Math.max(
                        0,
                        valorMeta - arrecadado
                    );

                    const metaAtingida =
                        pagos >= meta;

                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                metaAtingida
                                    ? "Green"
                                    : "Blue"
                            )
                            .setTitle(
                                "📊 Painel Administrativo"
                            )
                            .setDescription(
                                `**${rifa.premio}**\n` +
                                `Rifa #${rifa.id}`
                            )
                            .addFields(
                                {
                                    name: "👥 Compradores",
                                    value: `${compradores}`,
                                    inline: true
                                },
                                {
                                    name: "✅ Pagos",
                                    value: `${pagos}`,
                                    inline: true
                                },
                                {
                                    name: "🟡 Reservados",
                                    value: `${reservados}`,
                                    inline: true
                                },
                                {
                                    name: "⚪ Livres",
                                    value: `${livres}`,
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
                                    name: "📈 Progresso",
                                    value: `${porcentagem}%`,
                                    inline: true
                                },
                                {
                                    name: "⏳ Falta",
                                    value: metaAtingida
                                        ? "Meta atingida ✅"
                                        : `${faltam} números`,
                                    inline: true
                                },
                                {
                                    name: "💰 Arrecadado",
                                    value:
                                        `R$ ${arrecadado
                                            .toFixed(2)
                                            .replace(".", ",")}`,
                                    inline: true
                                },
                                {
                                    name: "💵 Falta em vendas",
                                    value: metaAtingida
                                        ? "R$ 0,00"
                                        : `R$ ${faltaValor
                                            .toFixed(2)
                                            .replace(".", ",")}`,
                                    inline: true
                                },
                                {
                                    name: "🏆 Sorteio",
                                    value: metaAtingida
                                        ? "🟢 Liberado"
                                        : "🔴 Aguardando meta",
                                    inline: true
                                }
                            )
                            .setFooter({
                                text:
                                    "Painel visível somente para administradores"
                            })
                            .setTimestamp();

                    const botoes =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        `painel_atualizar_${rifaId}`
                                    )
                                    .setLabel("Atualizar")
                                    .setEmoji("🔄")
                                    .setStyle(
                                        ButtonStyle.Primary
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        `painel_sortear_${rifaId}`
                                    )
                                    .setLabel(
                                        metaAtingida
                                            ? "Sortear"
                                            : "Meta não atingida"
                                    )
                                    .setEmoji("🏆")
                                    .setStyle(
                                        metaAtingida
                                            ? ButtonStyle.Success
                                            : ButtonStyle.Secondary
                                    )
                                    .setDisabled(
                                        !metaAtingida
                                    )
                            );

                    // Se apertou Atualizar
                    if (interaction.isButton()) {

                        return interaction.update({
                            embeds: [embed],
                            components: [botoes]
                        });
                    }

                    // Se abriu com /painel-admin
                    return interaction.reply({
                        embeds: [embed],
                        components: [botoes],
                        flags: MessageFlags.Ephemeral
                    });
                }
            );
        }
    );
};
