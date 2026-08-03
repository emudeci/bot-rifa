const {
    ChannelType,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const atualizarEmbed = require("./atualizarEmbed");

module.exports = async (client, interaction) => {

    const rifaId = Number(
        interaction.customId.split("_")[2]
    );

    const quantidade = Number.parseInt(
        interaction.fields.getTextInputValue("quantidade"),
        10
    );

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return interaction.reply({
            content: "❌ Quantidade inválida.",
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    db.get(
        `
        SELECT *
        FROM rifas
        WHERE id=?
        AND status='ativa'
        `,
        [rifaId],
        (err, rifa) => {

            if (err || !rifa) {
                return interaction.editReply({
                    content: "❌ Rifa não encontrada."
                });
            }

            db.all(
                `
                SELECT id, numero
                FROM numeros
                WHERE rifa_id=?
                AND status='livre'
                ORDER BY RANDOM()
                LIMIT ?
                `,
                [rifaId, quantidade],
                (err, numeros) => {

                    if (err) {
                        console.error(err);

                        return interaction.editReply({
                            content: "❌ Erro ao buscar números."
                        });
                    }

                    if (numeros.length < quantidade) {
                        return interaction.editReply({
                            content: "❌ Não existem números suficientes."
                        });
                    }

                    const valorTotal =
                        quantidade * Number(rifa.valor);

                    db.run(
                        `
                        INSERT INTO pagamentos (
                            rifa_id,
                            usuario_id,
                            valor,
                            status
                        )
                        VALUES (?, ?, ?, 'pendente')
                        `,
                        [
                            rifaId,
                            interaction.user.id,
                            valorTotal
                        ],
                        function (err) {

                            if (err) {
                                console.error(err);

                                return interaction.editReply({
                                    content: "❌ Erro ao criar pagamento."
                                });
                            }

                            const pagamentoId = this.lastID;

                            const placeholders = numeros
                                .map(() => "?")
                                .join(",");

                            const ids = numeros.map(
                                (numero) => numero.id
                            );

                            db.run(
                                `
                                UPDATE numeros
                                SET
                                    usuario_id=?,
                                    pagamento_id=?,
                                    status='reservado',
                                    reservado_em=datetime('now')
                                WHERE id IN (${placeholders})
                                AND status='livre'
                                `,
                                [
                                    interaction.user.id,
                                    pagamentoId,
                                    ...ids
                                ],
                                async function (err) {

                                    if (err) {
                                        console.error(err);

                                        db.run(
                                            `
                                            DELETE FROM pagamentos
                                            WHERE id=?
                                            `,
                                            [pagamentoId]
                                        );

                                        return interaction.editReply({
                                            content: "❌ Erro ao reservar números."
                                        });
                                    }

                                    if (this.changes !== quantidade) {
                                        db.run(
                                            `
                                            UPDATE numeros
                                            SET
                                                usuario_id=NULL,
                                                pagamento_id=NULL,
                                                status='livre',
                                                reservado_em=NULL
                                            WHERE pagamento_id=?
                                            `,
                                            [pagamentoId]
                                        );

                                        db.run(
                                            `
                                            DELETE FROM pagamentos
                                            WHERE id=?
                                            `,
                                            [pagamentoId]
                                        );

                                        return interaction.editReply({
                                            content: "❌ Alguns números acabaram de ser reservados."
                                        });
                                    }

                                    db.run(
                                        `
                                        UPDATE rifas
                                        SET vendidos = vendidos + ?
                                        WHERE id=?
                                        `,
                                        [quantidade, rifaId]
                                    );

                                    try {
                                        const guild = interaction.guild;

                                        const permissoes = [
                                            {
                                                id: guild.id,
                                                deny: [
                                                    PermissionFlagsBits.ViewChannel
                                                ]
                                            },
                                            {
                                                id: interaction.user.id,
                                                allow: [
                                                    PermissionFlagsBits.ViewChannel,
                                                    PermissionFlagsBits.SendMessages,
                                                    PermissionFlagsBits.ReadMessageHistory,
                                                    PermissionFlagsBits.AttachFiles
                                                ]
                                            },
                                            {
                                                id: client.user.id,
                                                allow: [
                                                    PermissionFlagsBits.ViewChannel,
                                                    PermissionFlagsBits.SendMessages,
                                                    PermissionFlagsBits.ManageChannels,
                                                    PermissionFlagsBits.ReadMessageHistory,
                                                    PermissionFlagsBits.AttachFiles
                                                ]
                                            }
                                        ];

                                        if (process.env.CARGO_ADMIN) {
                                            permissoes.push({
                                                id: process.env.CARGO_ADMIN,
                                                allow: [
                                                    PermissionFlagsBits.ViewChannel,
                                                    PermissionFlagsBits.SendMessages,
                                                    PermissionFlagsBits.ReadMessageHistory,
                                                    PermissionFlagsBits.AttachFiles,
                                                    PermissionFlagsBits.ManageMessages
                                                ]
                                            });
                                        }

                                        const canal = await guild.channels.create({
                                            name: `pagamento-${pagamentoId}`,
                                            type: ChannelType.GuildText,
                                            parent:
                                                process.env.CATEGORIA_TICKETS ||
                                                null,
                                            topic:
                                                `pagamento:${pagamentoId}|usuario:${interaction.user.id}`,
                                            permissionOverwrites: permissoes
                                        });

                                        db.run(
                                            `
                                            UPDATE pagamentos
                                            SET ticket_canal_id=?
                                            WHERE id=?
                                            `,
                                            [
                                                canal.id,
                                                pagamentoId
                                            ]
                                        );

                                        const lista = numeros
                                            .map((item) =>
                                                String(item.numero).padStart(
                                                    3,
                                                    "0"
                                                )
                                            )
                                            .join(", ");

                                        await canal.send({
                                            content:
`<@${interaction.user.id}> <@&${process.env.CARGO_ADMIN}>

🎫 **Ticket de pagamento #${pagamentoId}**

🎁 **Rifa:** ${rifa.premio}

🎟️ **Números reservados:**
${lista}

💰 **Valor:**
R$ ${valorTotal.toFixed(2).replace(".", ",")}

📎 Envie a imagem ou o PDF do comprovante neste canal.

⏳ Aguarde a confirmação de um administrador.`
                                        });

                                        await atualizarEmbed(
                                            client,
                                            rifaId
                                        );

                                        return interaction.editReply({
                                            content:
`✅ Compra reservada.

🎟️ **Números:**
${lista}

💰 **Total:**
R$ ${valorTotal.toFixed(2).replace(".", ",")}

🎫 **Ticket:**
${canal}`
                                        });

                                    } catch (error) {
                                        console.error(error);

                                        db.run(
                                            `
                                            UPDATE numeros
                                            SET
                                                usuario_id=NULL,
                                                pagamento_id=NULL,
                                                status='livre',
                                                reservado_em=NULL
                                            WHERE pagamento_id=?
                                            `,
                                            [pagamentoId]
                                        );

                                        db.run(
                                            `
                                            UPDATE rifas
                                            SET vendidos = MAX(vendidos - ?, 0)
                                            WHERE id=?
                                            `,
                                            [quantidade, rifaId]
                                        );

                                        db.run(
                                            `
                                            UPDATE pagamentos
                                            SET status='erro_ticket'
                                            WHERE id=?
                                            `,
                                            [pagamentoId]
                                        );

                                        atualizarEmbed(client, rifaId);

                                        return interaction.editReply({
                                            content: "❌ Não foi possível criar o ticket."
                                        });
                                    }
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};