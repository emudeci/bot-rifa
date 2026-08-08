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

    const textoNumeros =
        interaction.fields.getTextInputValue("numeros");

    const numerosEscolhidos = [
        ...new Set(
            textoNumeros
                .split(/[\s,;]+/)
                .map(numero => Number.parseInt(numero, 10))
                .filter(numero => Number.isInteger(numero))
        )
    ];

    if (numerosEscolhidos.length === 0) {
        return interaction.reply({
            content:
                "❌ Digite pelo menos um número válido.\n\n" +
                "Exemplo: `15, 28, 104, 587`",
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

            const invalidos = numerosEscolhidos.filter(
                numero =>
                    numero < 1 ||
                    numero > rifa.quantidade
            );

            if (invalidos.length > 0) {
                return interaction.editReply({
                    content:
                        "❌ Alguns números não existem nessa rifa:\n" +
                        invalidos
                            .map(numero =>
                                `\`${numero}\``
                            )
                            .join(", ")
                });
            }

            const placeholders =
                numerosEscolhidos
                    .map(() => "?")
                    .join(",");

            db.all(
                `
                SELECT id, numero, status
                FROM numeros
                WHERE
                    rifa_id=?
                    AND numero IN (${placeholders})
                `,
                [
                    rifaId,
                    ...numerosEscolhidos
                ],
                (err, numerosBanco) => {

                    if (err) {
                        console.error(err);

                        return interaction.editReply({
                            content:
                                "❌ Erro ao verificar os números."
                        });
                    }

                    const numerosOcupados =
                        numerosBanco
                            .filter(
                                item =>
                                    item.status !== "livre"
                            )
                            .map(
                                item =>
                                    item.numero
                            );

                    if (numerosOcupados.length > 0) {
                        return interaction.editReply({
                            content:
                                "❌ Esses números já estão reservados ou pagos:\n\n" +
                                numerosOcupados
                                    .map(numero =>
                                        `🎟 ${String(numero)
                                            .padStart(3, "0")}`
                                    )
                                    .join("\n") +
                                "\n\nEscolha outros números."
                        });
                    }

                    if (
                        numerosBanco.length !==
                        numerosEscolhidos.length
                    ) {
                        return interaction.editReply({
                            content:
                                "❌ Um ou mais números não foram encontrados."
                        });
                    }

                    const quantidade =
                        numerosEscolhidos.length;

                    const valorTotal =
                        quantidade *
                        Number(rifa.valor);

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
                                    content:
                                        "❌ Erro ao criar pagamento."
                                });
                            }

                            const pagamentoId =
                                this.lastID;

                            const ids =
                                numerosBanco.map(
                                    numero =>
                                        numero.id
                                );

                            const idsPlaceholders =
                                ids
                                    .map(() => "?")
                                    .join(",");

                            db.run(
                                `
                                UPDATE numeros
                                SET
                                    usuario_id=?,
                                    pagamento_id=?,
                                    status='reservado',
                                    reservado_em=datetime('now')
                                WHERE
                                    id IN (${idsPlaceholders})
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
                                            content:
                                                "❌ Erro ao reservar números."
                                        });
                                    }

                                    if (
                                        this.changes !==
                                        quantidade
                                    ) {
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
                                            content:
                                                "❌ Um dos números acabou de ser reservado por outra pessoa. Tente novamente."
                                        });
                                    }

                                    db.run(
                                        `
                                        UPDATE rifas
                                        SET vendidos =
                                            vendidos + ?
                                        WHERE id=?
                                        `,
                                        [
                                            quantidade,
                                            rifaId
                                        ]
                                    );

                                    try {

                                        const guild =
                                            interaction.guild;

                                        const permissoes = [
                                            {
                                                id: guild.id,
                                                deny: [
                                                    PermissionFlagsBits.ViewChannel
                                                ]
                                            },
                                            {
                                                id:
                                                    interaction.user.id,
                                                allow: [
                                                    PermissionFlagsBits.ViewChannel,
                                                    PermissionFlagsBits.SendMessages,
                                                    PermissionFlagsBits.ReadMessageHistory,
                                                    PermissionFlagsBits.AttachFiles
                                                ]
                                            },
                                            {
                                                id:
                                                    client.user.id,
                                                allow: [
                                                    PermissionFlagsBits.ViewChannel,
                                                    PermissionFlagsBits.SendMessages,
                                                    PermissionFlagsBits.ManageChannels,
                                                    PermissionFlagsBits.ReadMessageHistory,
                                                    PermissionFlagsBits.AttachFiles
                                                ]
                                            }
                                        ];

                                        if (
                                            process.env.CARGO_ADMIN
                                        ) {
                                            permissoes.push({
                                                id:
                                                    process.env.CARGO_ADMIN,
                                                allow: [
                                                    PermissionFlagsBits.ViewChannel,
                                                    PermissionFlagsBits.SendMessages,
                                                    PermissionFlagsBits.ReadMessageHistory,
                                                    PermissionFlagsBits.AttachFiles,
                                                    PermissionFlagsBits.ManageMessages
                                                ]
                                            });
                                        }

                                        const canal =
                                            await guild.channels.create({
                                                name:
                                                    `pagamento-${pagamentoId}`,
                                                type:
                                                    ChannelType.GuildText,
                                                parent:
                                                    process.env.CATEGORIA_TICKETS ||
                                                    null,
                                                topic:
                                                    `pagamento:${pagamentoId}|usuario:${interaction.user.id}`,
                                                permissionOverwrites:
                                                    permissoes
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

                                        const lista =
                                            numerosEscolhidos
                                                .sort(
                                                    (a, b) =>
                                                        a - b
                                                )
                                                .map(
                                                    numero =>
                                                        String(numero)
                                                            .padStart(
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

🎟️ **Números escolhidos:**
${lista}

📦 **Quantidade:** ${quantidade}

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
`✅ Números reservados com sucesso.

🎟️ **Seus números:**
${lista}

📦 **Quantidade:** ${quantidade}

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
                                            SET vendidos =
                                                MAX(
                                                    vendidos - ?,
                                                    0
                                                )
                                            WHERE id=?
                                            `,
                                            [
                                                quantidade,
                                                rifaId
                                            ]
                                        );

                                        db.run(
                                            `
                                            UPDATE pagamentos
                                            SET status='erro_ticket'
                                            WHERE id=?
                                            `,
                                            [pagamentoId]
                                        );

                                        atualizarEmbed(
                                            client,
                                            rifaId
                                        );

                                        return interaction.editReply({
                                            content:
                                                "❌ Não foi possível criar o ticket."
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
