const {
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");
const atualizarEmbed = require("./atualizarEmbed")

module.exports = async (client, interaction) => {
    if (
        process.env.CARGO_ADMIN &&
        !interaction.member.roles.cache.has(
            process.env.CARGO_ADMIN
        ) &&
        !interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return interaction.reply({
            content: "❌ Você não pode recusar pagamentos.",
            flags: MessageFlags.Ephemeral
        });
    }

    const pagamentoId = Number(
        interaction.customId.split("_")[1]
    );

    await interaction.deferUpdate();

    db.get(
        `
        SELECT *
        FROM pagamentos
        WHERE id=?
        `,
        [pagamentoId],
        (err, pagamento) => {
            if (err || !pagamento) {
                return interaction.editReply({
                    content: "❌ Pagamento não encontrado.",
                    embeds: [],
                    components: []
                });
            }

            if (pagamento.status === "aprovado") {
                return interaction.editReply({
                    content: "❌ Um pagamento aprovado não pode ser recusado.",
                    embeds: [],
                    components: []
                });
            }

            if (
                pagamento.status === "recusado" ||
                pagamento.status === "cancelado"
            ) {
                return interaction.editReply({
                    content: "❌ Este pagamento já foi encerrado.",
                    embeds: [],
                    components: []
                });
            }

            db.get(
                `
                SELECT COUNT(*) AS quantidade
                FROM numeros
                WHERE pagamento_id=?
                `,
                [pagamentoId],
                (err, resultado) => {
                    if (err) {
                        console.error(err);

                        return interaction.editReply({
                            content: "❌ Erro ao buscar os números.",
                            embeds: [],
                            components: []
                        });
                    }

                    const quantidade =
                        resultado?.quantidade || 0;

                    db.run(
                        `
                        UPDATE pagamentos
                        SET status='recusado'
                        WHERE id=?
                        `,
                        [pagamentoId],
                        (err) => {
                            if (err) {
                                console.error(err);

                                return interaction.editReply({
                                    content: "❌ Erro ao recusar o pagamento.",
                                    embeds: [],
                                    components: []
                                });
                            }

                            db.run(
                                `
                                UPDATE numeros
                                SET
                                    status='livre',
                                    usuario_id=NULL,
                                    pagamento_id=NULL,
                                    reservado_em=NULL,
                                    pago_em=NULL
                                WHERE pagamento_id=?
                                `,
                                [pagamentoId],
                                (err) => {
                                    if (err) {
                                        console.error(err);

                                        return interaction.editReply({
                                            content: "❌ Erro ao liberar os números.",
                                            embeds: [],
                                            components: []
                                        });
                                    }

                                    db.run(
                                        `
                                        UPDATE rifas
                                        SET vendidos=MAX(vendidos - ?, 0)
                                        WHERE id=?
                                        `,
                                        [
                                            quantidade,
                                            pagamento.rifa_id
                                        ],
                                        async (err) => {
                                            if (err) {
                                                console.error(err);
                                            }

                                            await atualizarEmbed(
                                                client,
                                                pagamento.rifa_id
                                            );

                                            const canal =
                                                interaction.channel;

                                            await interaction.editReply({
                                                content:
`❌ Pagamento recusado por ${interaction.user}.

Os números foram liberados novamente.

🔒 Este ticket será fechado em 7 segundos.`,
                                                embeds: [],
                                                components: []
                                            });

                                            const usuario =
                                                await client.users
                                                    .fetch(
                                                        pagamento.usuario_id
                                                    )
                                                    .catch(() => null);

                                            if (usuario) {
                                                await usuario.send(
                                                    `❌ Seu pagamento #${pagamentoId} foi recusado.`
                                                ).catch(() => null);
                                            }

                                            setTimeout(async () => {
                                                await canal.delete(
                                                    "Pagamento recusado"
                                                ).catch(console.error);
                                            }, 7000);
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};